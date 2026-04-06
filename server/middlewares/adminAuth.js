import pool from '../db.js';

export const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
        }

        next();
    } catch (error) {
        console.error('Error verificando rol admin:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
