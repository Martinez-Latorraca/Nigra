import pool from '../db.js';

// requireShelter: solo si el user es dueño de un shelter approved (y no
// soft-deleted). El shelter_id queda expuesto en req.shelter para el
// controller downstream.
export const requireShelter = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, approved FROM shelters
             WHERE owner_user_id = $1 AND deleted_at IS NULL`,
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Necesitás un refugio registrado.' });
        }
        if (!rows[0].approved) {
            return res.status(403).json({ error: 'Tu refugio está pendiente de aprobación.' });
        }
        req.shelter = { id: rows[0].id };
        next();
    } catch (error) {
        console.error('requireShelter error:', error);
        res.status(500).json({ error: 'Error verificando refugio.' });
    }
};

// Gate negativo: un user que es shelter NO puede reportar pets ni chatear
// como owner. Este middleware bloquea acciones "de user regular" cuando el
// caller es un shelter.
export const blockIfShelter = async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT 1 FROM shelters
             WHERE owner_user_id = $1 AND deleted_at IS NULL`,
            [req.user.id]
        );
        if (rows.length > 0) {
            return res.status(403).json({
                error: 'Los refugios no reportan mascotas ni participan del feed de perdidas/encontradas.',
                code: 'shelter_forbidden',
            });
        }
        next();
    } catch (error) {
        console.error('blockIfShelter error:', error);
        res.status(500).json({ error: 'Error verificando cuenta.' });
    }
};
