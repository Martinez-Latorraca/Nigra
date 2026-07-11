import pool from '../db.js';

// POST /api/waitlist — registro público en la lista de espera.
export const joinWaitlist = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const city = req.body.city ? String(req.body.city).trim() : null;

        const ip = req.ip || null;
        const userAgent = req.get('user-agent')?.slice(0, 500) || null;

        const insert = await pool.query(
            `INSERT INTO waitlist (name, email, city, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [name, email, city, ip, userAgent]
        );

        // Si ya estaba, devolvemos success igual — no revelamos si el email
        // ya existía (evita enumeración).
        const alreadyRegistered = insert.rowCount === 0;
        res.status(201).json({ success: true, alreadyRegistered });
    } catch (error) {
        console.error('waitlist join error:', error);
        res.status(500).json({ error: 'No se pudo registrar. Intentá de nuevo.' });
    }
};

// GET /api/waitlist/count — contador público para prueba social en la landing.
export const getWaitlistCount = async (_req, res) => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) AS count FROM waitlist');
        res.json({ count: parseInt(rows[0].count, 10) });
    } catch (error) {
        console.error('waitlist count error:', error);
        res.status(500).json({ error: 'Error obteniendo el contador' });
    }
};
