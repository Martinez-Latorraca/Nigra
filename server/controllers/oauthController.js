// OAuth handlers para Google, Apple y Facebook.
//
// Modelo: user_oauth_links(user_id, provider, provider_id, linked_at).
// Un mismo user puede tener varios providers vinculados. El linking
// automático por email SOLO ocurre para providers que verifican email
// (Google/Apple). Facebook requiere linking explícito desde /link/facebook
// con el user ya autenticado.
//
// Env vars requeridas:
//   GOOGLE_CLIENT_ID_WEB     - Google OAuth client (web)
//   GOOGLE_CLIENT_ID_IOS     - Google OAuth client (iOS app)
//   GOOGLE_CLIENT_ID_ANDROID - Google OAuth client (Android app)
//                              Al menos uno debe estar seteado.
//   APPLE_BUNDLE_ID          - iOS bundle id (audience de Apple identity tokens)
//   FACEBOOK_APP_SECRET      - Firma appsecret_proof al llamar Graph API
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

// Trust model: Google/Apple verifican email antes de emitir tokens.
// Facebook NO re-verifica cuando el user cambia su email, por eso no
// permitimos linking-por-email desde Facebook (email takeover attack).
const PROVIDER_VERIFIES_EMAIL = { google: true, apple: true, facebook: false };

class OAuthLinkConflict extends Error {
    constructor(existingProvider) {
        super('email_already_registered');
        this.status = 409;
        this.existingProvider = existingProvider;
    }
}

class OAuthAlreadyLinkedToOther extends Error {
    constructor() {
        super('provider_linked_to_other_user');
        this.status = 409;
    }
}

// Cuenta soft-deleted encontrada durante el flow OAuth. No hacemos restore
// silencioso — el user tiene que pasar por /register para recuperarla.
class OAuthAccountDeleted extends Error {
    constructor() {
        super('account_deleted');
        this.status = 403;
    }
}

// ─── Verificación de tokens de cada provider ────────────────────────────

const verifyGoogle = async (idToken) => {
    const audience = [
        process.env.GOOGLE_CLIENT_ID_WEB,
        process.env.GOOGLE_CLIENT_ID_IOS,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
    ].filter(Boolean);
    if (audience.length === 0) throw new Error('Google OAuth no está configurado');
    const ticket = await googleClient.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload.email_verified) {
        const err = new Error('Tu email de Google no está verificado');
        err.status = 403;
        throw err;
    }
    return {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
    };
};

const verifyApple = async (identityToken, fullName) => {
    if (!process.env.APPLE_BUNDLE_ID) throw new Error('Apple Sign In no está configurado');
    const decoded = await verifyAppleToken(identityToken);
    return {
        provider: 'apple',
        providerId: decoded.sub,
        email: decoded.email || null,
        name: fullName || 'Usuario',
        avatarUrl: null,
    };
};

const verifyFacebook = async (accessToken) => {
    if (!process.env.FACEBOOK_APP_SECRET) throw new Error('Facebook Login no está configurado');
    const appsecretProof = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
        .update(accessToken)
        .digest('hex');
    const graphUrl =
        'https://graph.facebook.com/me' +
        '?fields=id,name,email,picture.type(large)' +
        `&access_token=${encodeURIComponent(accessToken)}` +
        `&appsecret_proof=${appsecretProof}`;
    const resp = await fetch(graphUrl);
    const data = await resp.json();
    if (data.error) {
        const err = new Error(`Facebook: ${data.error.message}`);
        err.status = 401;
        throw err;
    }
    return {
        provider: 'facebook',
        providerId: data.id,
        email: data.email || null,
        name: data.name,
        avatarUrl: data.picture?.data?.url || null,
    };
};

// ─── Lookup / creación ──────────────────────────────────────────────────

const findUserByOAuth = async (provider, providerId) => {
    const q = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.deleted_at
         FROM users u
         JOIN user_oauth_links l ON l.user_id = u.id
         WHERE l.provider = $1 AND l.provider_id = $2`,
        [provider, providerId]
    );
    return q.rows[0] || null;
};

const findUserByEmail = async (email) => {
    const q = await pool.query(
        'SELECT id, name, email, role, avatar_url, email_verified, deleted_at FROM users WHERE email = $1',
        [email]
    );
    return q.rows[0] || null;
};

// No reactivamos silenciosamente desde OAuth: si la cuenta está soft-deleted,
// tiramos error para que el frontend redirija al user a /register (único
// camino de recovery). Mantiene la intención del delete.
const rejectIfDeleted = (user) => {
    if (user?.deleted_at) throw new OAuthAccountDeleted();
    return user;
};

const primaryProviderOfUser = async (userId) => {
    const q = await pool.query(
        'SELECT provider FROM user_oauth_links WHERE user_id = $1 ORDER BY linked_at ASC LIMIT 1',
        [userId]
    );
    return q.rows[0]?.provider || 'password';
};

const insertOAuthLink = async (userId, provider, providerId) => {
    try {
        await pool.query(
            `INSERT INTO user_oauth_links (user_id, provider, provider_id)
             VALUES ($1, $2, $3)`,
            [userId, provider, providerId]
        );
    } catch (e) {
        // Unique violation: (provider, provider_id) ya pertenece a otro user.
        if (e.code === '23505') throw new OAuthAlreadyLinkedToOther();
        throw e;
    }
};

const findOrCreateOAuthUser = async ({ provider, providerId, email, name, avatarUrl }) => {
    // 1) Ya linkeado a este exact (provider, provider_id).
    const linked = await findUserByOAuth(provider, providerId);
    if (linked) return rejectIfDeleted(linked);

    // 2) Existe user con este email → intentar auto-link (solo Google/Apple).
    if (email) {
        const byEmail = rejectIfDeleted(await findUserByEmail(email));
        if (byEmail) {
            if (!PROVIDER_VERIFIES_EMAIL[provider] || !byEmail.email_verified) {
                const existingProvider = await primaryProviderOfUser(byEmail.id);
                throw new OAuthLinkConflict(existingProvider);
            }
            await insertOAuthLink(byEmail.id, provider, providerId);
            await pool.query(
                'UPDATE users SET avatar_url = COALESCE(avatar_url, $1), email_verified = true WHERE id = $2',
                [avatarUrl || null, byEmail.id]
            );
            return {
                id: byEmail.id,
                name: byEmail.name,
                email: byEmail.email,
                role: byEmail.role,
                avatar_url: byEmail.avatar_url || avatarUrl || null,
            };
        }
    }

    // 3) User nuevo.
    const verified = !!PROVIDER_VERIFIES_EMAIL[provider];
    const inserted = await pool.query(
        `INSERT INTO users (name, email, avatar_url, email_verified)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, avatar_url`,
        [name || 'Usuario', email || null, avatarUrl || null, verified]
    );
    const user = inserted.rows[0];
    await insertOAuthLink(user.id, provider, providerId);
    return user;
};

const respondWithSession = async (res, user) => {
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    // Chequeamos vet + shelter (mismo motivo que login): el frontend usa
    // has_vet/has_shelter + _approved para decidir el redirect post-login.
    let hasVet = false, vetApproved = false;
    let hasShelter = false, shelterApproved = false;
    try {
        const { rows: vetRows } = await pool.query(
            'SELECT approved FROM vets WHERE owner_user_id = $1',
            [user.id]
        );
        if (vetRows.length > 0) {
            hasVet = true;
            vetApproved = !!vetRows[0].approved;
        }
        const { rows: shelterRows } = await pool.query(
            'SELECT approved FROM shelters WHERE owner_user_id = $1 AND deleted_at IS NULL',
            [user.id]
        );
        if (shelterRows.length > 0) {
            hasShelter = true;
            shelterApproved = !!shelterRows[0].approved;
        }
    } catch (e) {
        console.error('respondWithSession vet/shelter check error:', e?.message);
    }
    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar_url: user.avatar_url,
            has_vet: hasVet,
            vet_approved: vetApproved,
            has_shelter: hasShelter,
            shelter_approved: shelterApproved,
        },
    });
};

const handleOAuthError = (res, error, providerLabel) => {
    console.error(`${providerLabel} OAuth error:`, error);
    if (error instanceof OAuthLinkConflict) {
        return res.status(409).json({
            error: `Ya existe una cuenta con este email (${error.existingProvider}). Iniciá sesión con ese método y despues linkeá ${providerLabel} desde el perfil.`,
            existingProvider: error.existingProvider,
        });
    }
    if (error instanceof OAuthAlreadyLinkedToOther) {
        return res.status(409).json({
            error: `Esta cuenta de ${providerLabel} ya está vinculada a otro usuario.`,
        });
    }
    if (error instanceof OAuthAccountDeleted) {
        return res.status(403).json({
            error: 'Esta cuenta fue eliminada. Podés recuperarla creándola nuevamente desde el registro.',
            code: 'account_deleted',
        });
    }
    res.status(error.status || 401).json({
        error: error.message || `Token de ${providerLabel} inválido`,
    });
};

// ─── Login handlers (público) ───────────────────────────────────────────

export const loginWithGoogle = async (req, res) => {
    try {
        const info = await verifyGoogle(req.body.idToken);
        const user = await findOrCreateOAuthUser(info);
        await respondWithSession(res, user);
    } catch (error) {
        handleOAuthError(res, error, 'Google');
    }
};

export const loginWithApple = async (req, res) => {
    try {
        const info = await verifyApple(req.body.identityToken, req.body.fullName);
        const user = await findOrCreateOAuthUser(info);
        await respondWithSession(res, user);
    } catch (error) {
        handleOAuthError(res, error, 'Apple');
    }
};

export const loginWithFacebook = async (req, res) => {
    try {
        const info = await verifyFacebook(req.body.accessToken);
        const user = await findOrCreateOAuthUser(info);
        await respondWithSession(res, user);
    } catch (error) {
        handleOAuthError(res, error, 'Facebook');
    }
};

// ─── Link explícito (requiere JWT) ──────────────────────────────────────

const linkExplicit = async (req, res, verify, providerLabel) => {
    try {
        const info = await verify();
        // Chequear que no esté ya linkeada a otra cuenta.
        const other = await findUserByOAuth(info.provider, info.providerId);
        if (other && other.id !== req.user.id) {
            throw new OAuthAlreadyLinkedToOther();
        }
        // Ya estaba linkeada a este mismo user → idempotente.
        if (!other) {
            await insertOAuthLink(req.user.id, info.provider, info.providerId);
        }
        // Poblar avatar si el user no tenía.
        if (info.avatarUrl) {
            await pool.query(
                'UPDATE users SET avatar_url = COALESCE(avatar_url, $1) WHERE id = $2',
                [info.avatarUrl, req.user.id]
            );
        }
        res.json({ success: true, provider: info.provider });
    } catch (error) {
        handleOAuthError(res, error, providerLabel);
    }
};

export const linkGoogle = (req, res) =>
    linkExplicit(req, res, () => verifyGoogle(req.body.idToken), 'Google');

export const linkApple = (req, res) =>
    linkExplicit(req, res, () => verifyApple(req.body.identityToken, req.body.fullName), 'Apple');

export const linkFacebook = (req, res) =>
    linkExplicit(req, res, () => verifyFacebook(req.body.accessToken), 'Facebook');

// ─── List / unlink ──────────────────────────────────────────────────────

export const listOAuthLinks = async (req, res) => {
    try {
        const links = await pool.query(
            'SELECT provider, linked_at FROM user_oauth_links WHERE user_id = $1 ORDER BY linked_at ASC',
            [req.user.id]
        );
        const hasPassword = await pool.query(
            'SELECT (password IS NOT NULL) AS has_password FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({
            links: links.rows,
            hasPassword: !!hasPassword.rows[0]?.has_password,
        });
    } catch (error) {
        console.error('listOAuthLinks error:', error);
        res.status(500).json({ error: 'Error listando cuentas vinculadas' });
    }
};

export const unlinkOAuthProvider = async (req, res) => {
    try {
        const { provider } = req.params;
        if (!['google', 'facebook', 'apple'].includes(provider)) {
            return res.status(400).json({ error: 'Provider inválido' });
        }
        // Guard: no permitir dejar al user sin ningún método de login.
        const links = await pool.query(
            'SELECT provider FROM user_oauth_links WHERE user_id = $1',
            [req.user.id]
        );
        const hasPasswordQ = await pool.query(
            'SELECT (password IS NOT NULL) AS has_password FROM users WHERE id = $1',
            [req.user.id]
        );
        const hasPassword = !!hasPasswordQ.rows[0]?.has_password;
        const others = links.rows.filter((r) => r.provider !== provider);
        if (!hasPassword && others.length === 0) {
            return res.status(400).json({
                error: 'No podés desvincular tu único método de login. Configurá una contraseña primero.',
            });
        }
        await pool.query(
            'DELETE FROM user_oauth_links WHERE user_id = $1 AND provider = $2',
            [req.user.id, provider]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('unlinkOAuthProvider error:', error);
        res.status(500).json({ error: 'Error desvinculando la cuenta' });
    }
};
