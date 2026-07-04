import pool from '../db.js';

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
