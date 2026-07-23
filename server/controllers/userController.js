import pool from '../db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';

export const updateLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { lat, lng } = req.body;
        await pool.query(
            'UPDATE users SET last_lat = $1, last_lng = $2, last_location_at = NOW() WHERE id = $3',
            [lat, lng, userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('updateLocation error:', error);
        res.status(500).json({ error: 'Error guardando ubicación' });
    }
};

// Acepta dos formas de body:
//  - { enabled: bool }  → forma legacy: setea perdidas y encontradas juntas.
//  - { notify_lost, notify_found, notify_radius_km }  → granular (nuevo).
// El notify_nearby "master" queda derivado (lost OR found) para no romper
// código viejo que aún lo lea.
export const updateNotifyNearby = async (req, res) => {
    try {
        const userId = req.user.id;
        const { enabled, notify_lost, notify_found, notify_radius_km } = req.body;

        let lost, found, radius;
        if (typeof enabled === 'boolean') {
            lost = enabled;
            found = enabled;
        } else {
            lost = typeof notify_lost === 'boolean' ? notify_lost : undefined;
            found = typeof notify_found === 'boolean' ? notify_found : undefined;
        }
        if (Number.isFinite(notify_radius_km)) radius = notify_radius_km;

        const sets = [];
        const values = [];
        let i = 1;
        if (typeof lost === 'boolean') { sets.push(`notify_lost = $${i++}`); values.push(lost); }
        if (typeof found === 'boolean') { sets.push(`notify_found = $${i++}`); values.push(found); }
        if (typeof radius === 'number') { sets.push(`notify_radius_km = $${i++}`); values.push(radius); }
        // Master derivado para compat: activo si alguno de los granulares está activo.
        if (typeof lost === 'boolean' || typeof found === 'boolean') {
            sets.push(`notify_nearby = (COALESCE($${i++}::boolean, notify_lost) OR COALESCE($${i++}::boolean, notify_found))`);
            values.push(typeof lost === 'boolean' ? lost : null);
            values.push(typeof found === 'boolean' ? found : null);
        }
        if (sets.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

        values.push(userId);
        const { rows } = await pool.query(
            `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}
             RETURNING notify_nearby, notify_lost, notify_found, notify_radius_km`,
            values
        );
        res.json({ success: true, ...rows[0] });
    } catch (error) {
        console.error('updateNotifyNearby error:', error);
        res.status(500).json({ error: 'Error actualizando preferencia' });
    }
};

export const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await pool.query(
            'SELECT id, name, email, role, avatar_url, notify_nearby, notify_lost, notify_found, notify_radius_km, deleted_at FROM users WHERE id = $1',
            [userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        // Si la cuenta fue soft-deleted, el frontend debe desloguear.
        // (El JWT sigue firmado pero ya no representa una cuenta activa.)
        if (rows[0].deleted_at) {
            return res.status(401).json({ error: 'Cuenta eliminada', code: 'account_deleted' });
        }
        const { deleted_at, ...safe } = rows[0];
        res.json(safe);
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Error obteniendo perfil' });
    }
};

// PATCH /api/users/me — el user edita su propio perfil (por ahora: nombre).
// El email no se toca acá: cambiarlo requiere re-verificación y merece su
// propio flujo.
export const updateMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;
        const { rows } = await pool.query(
            `UPDATE users SET name = $1 WHERE id = $2
             RETURNING id, name, email, role, avatar_url`,
            [name.trim(), userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        console.error('updateMe error:', error);
        res.status(500).json({ error: 'Error actualizando perfil' });
    }
};

// DELETE /api/users/me — soft delete. Marca users.deleted_at y, si el user
// era owner de una vet o refugio, también marca *.deleted_at (queda oculta
// del directorio). Los pets y mensajes NO se tocan: la mascota puede seguir
// necesitando la visibilidad. Las adoption_pets tampoco — quedan colgando
// del shelter soft-deleted (invisibles al público via JOIN filter). Volver
// a loguearse o registrarse con el mismo email reactiva todo.
export const deleteMe = async (req, res) => {
    try {
        await pool.query(
            'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );
        await pool.query(
            'UPDATE vets SET deleted_at = NOW() WHERE owner_user_id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );
        await pool.query(
            'UPDATE shelters SET deleted_at = NOW() WHERE owner_user_id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('deleteMe error:', error);
        res.status(500).json({ error: 'No se pudo eliminar la cuenta.' });
    }
};

// POST /api/users/me/avatar — sube foto a Cloudinary y actualiza avatar_url.
// Body: multipart con `image`. Mismo patrón que /api/vets/me/image.
export const uploadMyAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Falta la imagen.' });
        const result = await uploadBufferToCloudinary(req.file.buffer, 'mimo/users');
        const { rows } = await pool.query(
            `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url`,
            [result.secure_url, req.user.id]
        );
        res.json({ avatar_url: rows[0]?.avatar_url });
    } catch (error) {
        console.error('uploadMyAvatar error:', error);
        res.status(500).json({ error: 'No se pudo subir la imagen.' });
    }
};

export const registerPushToken = async (req, res) => {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token inválido' });
    }

    try {
        // Primero limpiamos el token de cualquier otro usuario que lo tuviera.
        // Un push_token identifica un DISPOSITIVO; si el dispositivo cambia de
        // cuenta, la cuenta anterior no debe seguir recibiendo push ahí.
        const cleaned = await pool.query(
            'UPDATE users SET push_token = NULL WHERE push_token = $1 AND id <> $2',
            [token, userId]
        );
        if (cleaned.rowCount > 0) {
            console.log(`📲 push_token liberado de ${cleaned.rowCount} usuario(s) previo(s)`);
        }
        await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [token, userId]);
        console.log(`📲 push_token registrado para user ${userId}: ${token.slice(0, 30)}…`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error registrando push token:', error);
        res.status(500).json({ error: 'Error guardando el token' });
    }
};
