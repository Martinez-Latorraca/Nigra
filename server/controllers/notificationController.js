import pool from '../db.js';

export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await pool.query(
            `SELECT id, type, data, read_at, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error en getMyNotifications:', error);
        res.status(500).json({ error: 'Error obteniendo notificaciones' });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifId = req.params.id;
        const { rowCount } = await pool.query(
            'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
            [notifId, userId]
        );
        res.json({ success: true, updated: rowCount });
    } catch (error) {
        console.error('Error en markNotificationRead:', error);
        res.status(500).json({ error: 'Error marcando notificación' });
    }
};
