import pool from '../db.js';

// POST /api/donations/click — registra que alguien tocó el CTA de donación.
// Fase 1 del plan donations tracking (ver [[project-donations-tracking]]):
// solo sabemos que clickearon, no si la donación se concretó.
//
// Auth opcional: el endpoint acepta requests sin token (por si el banner
// aparece en flows no autenticados a futuro). Si viene req.user lo usamos.
// Fire-and-forget desde el frontend: siempre 204, no rompe la apertura de MP.
export const trackDonationClick = async (req, res) => {
    try {
        const petId = req.body?.pet_id != null ? Number(req.body.pet_id) : null;
        const userId = req.user?.id ?? null;
        await pool.query(
            `INSERT INTO donation_clicks (pet_id, user_id) VALUES ($1, $2)`,
            [Number.isInteger(petId) && petId > 0 ? petId : null, userId]
        );
        res.status(204).end();
    } catch (error) {
        console.error('trackDonationClick error:', error);
        // Analytics no debe romper UX — devolvemos 204 igual.
        res.status(204).end();
    }
};

// GET /api/donations/stats — resumen de clicks para el admin. Fase 1 solo
// tiene clicks (sin donaciones concretadas — eso es fase 2 con webhook MP).
export const getDonationStats = async (_req, res) => {
    try {
        const [totals, last30, topPets] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS total FROM donation_clicks'),
            pool.query(
                `SELECT COUNT(*)::int AS n
                 FROM donation_clicks
                 WHERE clicked_at >= NOW() - INTERVAL '30 days'`
            ),
            // Top casos por clicks — cuáles reencuentros generan más ganas de donar.
            pool.query(
                `SELECT dc.pet_id, COUNT(*)::int AS clicks,
                        p.name AS pet_name, p.photo_url
                 FROM donation_clicks dc
                 LEFT JOIN pets p ON p.id = dc.pet_id
                 WHERE dc.pet_id IS NOT NULL
                 GROUP BY dc.pet_id, p.name, p.photo_url
                 ORDER BY clicks DESC
                 LIMIT 5`
            ),
        ]);
        res.json({
            total_clicks: totals.rows[0].total,
            clicks_30d: last30.rows[0].n,
            top_pets: topPets.rows,
        });
    } catch (error) {
        console.error('getDonationStats error:', error);
        res.status(500).json({ error: 'Error obteniendo stats de donaciones.' });
    }
};
