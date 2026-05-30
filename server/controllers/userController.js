import pool from '../db.js';

export const registerPushToken = async (req, res) => {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token inválido' });
    }

    try {
        await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [token, userId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error registrando push token:', error);
        res.status(500).json({ error: 'Error guardando el token' });
    }
};
