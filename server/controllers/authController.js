import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { sendResetEmail, sendVerificationEmail } from '../lib/mailer.js';
import { slugify, ensureUniqueVetSlug } from '../utils/slug.js';

const JWT_SECRET = process.env.JWT_SECRET;
const RESET_TOKEN_TTL_MIN = 60; // 1 hora
const VERIFY_TOKEN_TTL_HOURS = 48;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const insertVerificationToken = async (userId) => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
    // Invalidamos cualquier token pendiente previo del user antes de crear el nuevo.
    await pool.query(
        `UPDATE email_verifications SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [userId]
    );
    await pool.query(
        `INSERT INTO email_verifications (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );
    return rawToken;
};

export const register = async (req, res) => {
    try {
        const { name, email, password, account_type } = req.body;
        const isVet = account_type === 'vet';

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const existing = userCheck.rows[0];

        // Caso especial: el email pertenece a una cuenta soft-deleted. En vez
        // de rechazar el registro o crear duplicado, reactivamos la cuenta con
        // el nuevo password/name y limpiamos deleted_at. Si el user era vet
        // owner, también reactivamos su vet. Los pets/mensajes históricos
        // vuelven a estar accesibles.
        //
        // IMPORTANTE: siempre re-verificamos el email al restaurar, incluso
        // si estaba verificado antes. Esto bloquea un ataque de reclamo:
        // alguien que conoce el email de un user borrado podría registrarse
        // con su propio password y quedarse con los pets/chats históricos.
        // El re-verify obliga a probar posesión del inbox.
        if (existing && existing.deleted_at) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            await pool.query(
                `UPDATE users
                 SET name = $1, password = $2, deleted_at = NULL, email_verified = FALSE
                 WHERE id = $3`,
                [name, passwordHash, existing.id]
            );
            await pool.query(
                'UPDATE vets SET deleted_at = NULL WHERE owner_user_id = $1',
                [existing.id]
            );
            // Fire-and-forget: mail de verificación (igual que en signup nuevo).
            try {
                const token = await insertVerificationToken(existing.id);
                sendVerificationEmail({ to: existing.email, token, name })
                    .catch((e) => console.error('sendVerificationEmail error:', e?.message));
            } catch (e) {
                console.error('verification token insert error:', e?.message);
            }
            const restored = {
                id: existing.id,
                name,
                email: existing.email,
                role: existing.role,
            };
            return res.json({ success: true, user: restored, restored: true, requires_verification: true });
        }

        if (existing) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            `INSERT INTO users (name, email, password, email_verified)
             VALUES ($1, $2, $3, FALSE)
             RETURNING id, name, email, role`,
            [name, email, passwordHash]
        );
        const user = newUser.rows[0];

        // Si registró como vet, creamos también la row en vets con datos
        // mínimos. El user completará el resto desde el dashboard tras
        // verificar email + login. approved=false hasta que un admin la
        // apruebe desde el AdminPanel.
        if (isVet) {
            try {
                const slug = await ensureUniqueVetSlug(pool, slugify(name));
                await pool.query(
                    `INSERT INTO vets (slug, name, owner_user_id, email, approved)
                     VALUES ($1, $2, $3, $4, FALSE)`,
                    [slug, name, user.id, email]
                );
            } catch (e) {
                console.error('vet auto-create error:', e?.message);
            }
        }

        // Fire-and-forget: mail de verificación.
        try {
            const token = await insertVerificationToken(user.id);
            sendVerificationEmail({ to: email, token, name })
                .catch((e) => console.error('sendVerificationEmail error:', e?.message));
        } catch (e) {
            console.error('verification token insert error:', e?.message);
        }

        res.json({ success: true, user, requires_verification: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};

// Consume el token de verificación y activa el user.
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        const tokenHash = hashToken(token);

        const { rows } = await pool.query(
            `SELECT id, user_id FROM email_verifications
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()`,
            [tokenHash]
        );
        if (rows.length === 0) {
            return res.status(400).json({
                error: 'El link ya expiró o no es válido. Pedí uno nuevo.',
            });
        }
        const verifyRow = rows[0];

        await pool.query(
            'UPDATE users SET email_verified = TRUE WHERE id = $1',
            [verifyRow.user_id]
        );
        await pool.query(
            'UPDATE email_verifications SET used_at = NOW() WHERE id = $1',
            [verifyRow.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('verifyEmail error:', error);
        res.status(500).json({ error: 'No se pudo verificar el email.' });
    }
};

// Reenvía el mail de verificación. Devuelve 200 siempre (no revela si el
// email existe o no) — pero solo dispara el envío si corresponde.
export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        const { rows } = await pool.query(
            'SELECT id, name, email_verified FROM users WHERE email = $1',
            [email]
        );
        const user = rows[0];

        if (user && !user.email_verified) {
            try {
                const token = await insertVerificationToken(user.id);
                sendVerificationEmail({ to: email, token, name: user.name })
                    .catch((e) => console.error('resend sendVerificationEmail error:', e?.message));
            } catch (e) {
                console.error('resend token insert error:', e?.message);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('resendVerification error:', error);
        res.json({ success: true });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // JOIN a vets para decidir el redirect post-login desde el frontend.
        // has_vet + vet_approved permite al cliente redirigir a /vets/dashboard
        // vs /app sin llamadas extra.
        const user = await pool.query(
            `SELECT u.*, v.id AS vet_id, v.approved AS vet_approved
             FROM users u
             LEFT JOIN vets v ON v.owner_user_id = u.id
             WHERE u.email = $1`,
            [email]
        );
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const row = user.rows[0];
        const validPassword = await bcrypt.compare(password, row.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!row.email_verified) {
            return res.status(403).json({
                error: 'Verificá tu email antes de iniciar sesión.',
                code: 'email_not_verified',
            });
        }

        // Cuenta soft-deleted: no dejamos loguearse. Si el user quiere volver,
        // tiene que pasar explícitamente por /register — ese es el único
        // camino de reactivación. Si permitiéramos restore automático en
        // login, el "Eliminar cuenta" quedaría vacío de intención.
        if (row.deleted_at) {
            return res.status(403).json({
                error: 'Esta cuenta fue eliminada. Podés recuperarla creándola nuevamente con este mismo email.',
                code: 'account_deleted',
            });
        }

        const token = jwt.sign({ id: row.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: row.id,
                name: row.name,
                email: row.email,
                role: row.role,
                avatar_url: row.avatar_url,
                has_vet: !!row.vet_id,
                vet_approved: !!row.vet_approved,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el login' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { password } = req.body || {};

        // Re-verificamos la identidad además del JWT: un token robado no debería
        // ser suficiente para borrar toda la cuenta. Si es cuenta con password
        // local, exigimos password. Si es OAuth-only (sin password), el JWT es
        // el único auth disponible — pendiente: pedir re-auth con el provider.
        const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [user_id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const hasLocalPassword = !!rows[0].password;
        if (hasLocalPassword) {
            if (typeof password !== 'string' || !password) {
                return res.status(400).json({ error: 'Necesitás confirmar tu contraseña para eliminar la cuenta.' });
            }
            const ok = await bcrypt.compare(password, rows[0].password);
            if (!ok) {
                return res.status(401).json({ error: 'Contraseña incorrecta.' });
            }
        }

        // 1. Borramos sus mensajes (enviados y recibidos)
        await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user_id]);

        // 2. Borramos sus mascotas
        await pool.query('DELETE FROM pets WHERE user_id = $1', [user_id]);

        // 3. Borramos el usuario
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Cuenta y reportes eliminados con éxito' });
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Solicitar recuperación de contraseña. Devuelve 200 siempre para no filtrar
// si un email existe o no en la base (attacker enumeration). El envío del
// mail solo se dispara si el user existe Y tiene password local — las
// cuentas OAuth-only se ignoran silenciosamente.
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const { rows } = await pool.query(
            'SELECT id, name, password FROM users WHERE email = $1',
            [email]
        );
        const user = rows[0];

        if (user && user.password) {
            const rawToken = crypto.randomBytes(32).toString('hex'); // 64 chars
            const tokenHash = hashToken(rawToken);
            const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);

            await pool.query(
                `INSERT INTO password_resets (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`,
                [user.id, tokenHash, expiresAt]
            );

            // Fire-and-forget para no bloquear la respuesta si el SMTP está lento.
            sendResetEmail({ to: email, token: rawToken, name: user.name })
                .catch((e) => console.error('sendResetEmail error:', e?.message));
        }

        res.json({ success: true });
    } catch (error) {
        console.error('forgotPassword error:', error);
        // Igual devolvemos 200 para no filtrar diferencias de comportamiento.
        res.json({ success: true });
    }
};

// Consume un token de reset y actualiza la contraseña. Token single-use:
// marcamos used_at para invalidarlo aunque el request tire error después.
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const tokenHash = hashToken(token);

        const { rows } = await pool.query(
            `SELECT id, user_id FROM password_resets
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()`,
            [tokenHash]
        );
        if (rows.length === 0) {
            return res.status(400).json({ error: 'El link ya expiró o no es válido. Pedí uno nuevo.' });
        }
        const resetRow = rows[0];

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, resetRow.user_id]);
        await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [resetRow.id]);
        // Invalidamos también cualquier otro token pendiente del mismo user.
        await pool.query(
            `UPDATE password_resets SET used_at = NOW()
             WHERE user_id = $1 AND used_at IS NULL`,
            [resetRow.user_id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('resetPassword error:', error);
        res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }
};