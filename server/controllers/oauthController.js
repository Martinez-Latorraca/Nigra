// OAuth handlers for Google, Apple and Facebook.
//
// Required env vars:
//   GOOGLE_CLIENT_ID_WEB     - Google OAuth client (web) used by Expo dev flow
//   GOOGLE_CLIENT_ID_IOS     - Google OAuth client (iOS app)
//   GOOGLE_CLIENT_ID_ANDROID - Google OAuth client (Android app)
//                              At least one must be set; all set are accepted.
//   APPLE_BUNDLE_ID          - iOS bundle id (audience of Apple identity tokens)
//   FACEBOOK_APP_SECRET      - Used to sign appsecret_proof when calling Graph API
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import jwksClient from 'jwks-rsa';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;

const googleClient = new OAuth2Client();

const appleJwks = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
    rateLimit: true,
});

const getAppleSigningKey = (header, callback) => {
    appleJwks.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
    });
};

const verifyAppleToken = (identityToken) =>
    new Promise((resolve, reject) => {
        jwt.verify(
            identityToken,
            getAppleSigningKey,
            {
                audience: process.env.APPLE_BUNDLE_ID,
                issuer: 'https://appleid.apple.com',
                algorithms: ['RS256'],
            },
            (err, decoded) => (err ? reject(err) : resolve(decoded))
        );
    });

const findOrCreateOAuthUser = async ({ provider, providerId, email, name, avatarUrl }) => {
    // 1) Already linked: same provider + provider_id.
    const existing = await pool.query(
        'SELECT id, name, email, role, avatar_url FROM users WHERE provider = $1 AND provider_id = $2',
        [provider, providerId]
    );
    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    // 2) Link by email: an account with this email already exists (e.g. created
    // with a password or another provider). Providers give us verified emails
    // (Google checks email_verified before calling this; Apple/Facebook return
    // the account email), so it's safe to log them into the existing account.
    if (email) {
        const byEmail = await pool.query(
            'SELECT id, name, email, role, avatar_url, provider_id FROM users WHERE email = $1',
            [email]
        );
        if (byEmail.rows.length > 0) {
            const user = byEmail.rows[0];
            // If the account had no linked social identity yet (e.g. a local
            // password account), attach this provider so the fast path (1) hits
            // next time. Backfill the avatar only if missing.
            if (!user.provider_id) {
                await pool.query(
                    'UPDATE users SET provider = $1, provider_id = $2, avatar_url = COALESCE(avatar_url, $3) WHERE id = $4',
                    [provider, providerId, avatarUrl || null, user.id]
                );
            }
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar_url: user.avatar_url || avatarUrl || null,
            };
        }
    }

    // 3) New user.
    const inserted = await pool.query(
        `INSERT INTO users (name, email, provider, provider_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, avatar_url`,
        [name || 'Usuario', email || null, provider, providerId, avatarUrl || null]
    );
    return inserted.rows[0];
};

const respondWithSession = (res, user) => {
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar_url: user.avatar_url,
        },
    });
};

export const loginWithGoogle = async (req, res) => {
    try {
        const { idToken } = req.body;

        const audience = [
            process.env.GOOGLE_CLIENT_ID_WEB,
            process.env.GOOGLE_CLIENT_ID_IOS,
            process.env.GOOGLE_CLIENT_ID_ANDROID,
        ].filter(Boolean);

        if (audience.length === 0) {
            return res.status(500).json({ error: 'Google OAuth no está configurado en el servidor' });
        }

        const ticket = await googleClient.verifyIdToken({ idToken, audience });
        const payload = ticket.getPayload();

        if (!payload.email_verified) {
            return res.status(403).json({ error: 'Tu email de Google no está verificado' });
        }

        const user = await findOrCreateOAuthUser({
            provider: 'google',
            providerId: payload.sub,
            email: payload.email,
            name: payload.name,
            avatarUrl: payload.picture,
        });

        respondWithSession(res, user);
    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(error.status || 401).json({
            error: error.message || 'Token de Google inválido',
        });
    }
};

export const loginWithApple = async (req, res) => {
    try {
        const { identityToken, fullName } = req.body;

        if (!process.env.APPLE_BUNDLE_ID) {
            return res.status(500).json({ error: 'Apple Sign In no está configurado en el servidor' });
        }

        const decoded = await verifyAppleToken(identityToken);

        const user = await findOrCreateOAuthUser({
            provider: 'apple',
            providerId: decoded.sub,
            email: decoded.email || null,
            name: fullName || 'Usuario',
            avatarUrl: null,
        });

        respondWithSession(res, user);
    } catch (error) {
        console.error('Apple OAuth error:', error);
        res.status(error.status || 401).json({
            error: error.message || 'Token de Apple inválido',
        });
    }
};

export const loginWithFacebook = async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!process.env.FACEBOOK_APP_SECRET) {
            return res.status(500).json({ error: 'Facebook Login no está configurado en el servidor' });
        }

        const appsecretProof = crypto
            .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
            .update(accessToken)
            .digest('hex');

        const graphUrl =
            'https://graph.facebook.com/me' +
            '?fields=id,name,email,picture.type(large)' +
            `&access_token=${encodeURIComponent(accessToken)}` +
            `&appsecret_proof=${appsecretProof}`;

        const fbResponse = await fetch(graphUrl);
        const fbData = await fbResponse.json();

        if (fbData.error) {
            return res.status(401).json({ error: `Facebook: ${fbData.error.message}` });
        }

        const user = await findOrCreateOAuthUser({
            provider: 'facebook',
            providerId: fbData.id,
            email: fbData.email || null,
            name: fbData.name,
            avatarUrl: fbData.picture?.data?.url || null,
        });

        respondWithSession(res, user);
    } catch (error) {
        console.error('Facebook OAuth error:', error);
        res.status(error.status || 401).json({
            error: error.message || 'Token de Facebook inválido',
        });
    }
};
