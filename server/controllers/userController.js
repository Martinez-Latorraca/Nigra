import pool from '../db.js';

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

export const updateNotifyNearby = async (req, res) => {
    try {
        const userId = req.user.id;
        const { enabled } = req.body;
        const { rows } = await pool.query(
            'UPDATE users SET notify_nearby = $1 WHERE id = $2 RETURNING notify_nearby',
            [enabled, userId]
        );
        res.json({ success: true, notify_nearby: rows[0]?.notify_nearby ?? enabled });
    } catch (error) {
        console.error('updateNotifyNearby error:', error);
        res.status(500).json({ error: 'Error actualizando preferencia' });
    }
};

export const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await pool.query(
            'SELECT id, name, email, role, avatar_url, notify_nearby FROM users WHERE id = $1',
            [userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Error obteniendo perfil' });
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
