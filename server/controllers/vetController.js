import pool from '../db.js';

const PUBLIC_COLUMNS = `
    id, slug, name, email, phone, whatsapp, website, instagram,
    address, city, country, lat, lng, logo_url, cover_url, bio,
    hours, services, plan, verified_at, created_at
`;

// Slugify básico: normaliza acentos, minúsculas, alfanumérico + guiones.
// Si el slug ya existe, agrega -2, -3, ... hasta encontrar uno libre.
const slugify = (raw) => {
    return String(raw)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
};

const ensureUniqueSlug = async (base) => {
    let slug = base || 'vet';
    let n = 1;
    while (true) {
        const candidate = n === 1 ? slug : `${slug}-${n}`;
        const { rows } = await pool.query('SELECT 1 FROM vets WHERE slug = $1', [candidate]);
        if (rows.length === 0) return candidate;
        n += 1;
        if (n > 999) throw new Error('cannot find unique slug');
    }
};

// POST /api/vets — auto-registro del user actual como owner. 409 si ya tiene una.
export const createVet = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const existing = await pool.query('SELECT id FROM vets WHERE owner_user_id = $1', [ownerId]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya tenés una veterinaria registrada.' });
        }

        const b = req.body;
        const slug = await ensureUniqueSlug(b.slug ? slugify(b.slug) : slugify(b.name));

        const result = await pool.query(
            `INSERT INTO vets (
                slug, name, owner_user_id, email, phone, whatsapp, website, instagram,
                address, city, country, lat, lng, logo_url, cover_url, bio, hours, services
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
            ) RETURNING ${PUBLIC_COLUMNS}, approved, owner_user_id`,
            [
                slug, b.name, ownerId, b.email || null, b.phone || null, b.whatsapp || null,
                b.website || null, b.instagram || null, b.address || null, b.city || null,
                b.country || 'UY', b.lat ?? null, b.lng ?? null, b.logo_url || null,
                b.cover_url || null, b.bio || null, b.hours || null, b.services || [],
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('createVet error:', error);
        res.status(500).json({ error: 'No se pudo crear la veterinaria.' });
    }
};

// GET /api/vets/me — la vet del user autenticado (approved o no).
export const getMyVet = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS}, approved, owner_user_id FROM vets WHERE owner_user_id = $1`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('getMyVet error:', error);
        res.status(500).json({ error: 'Error obteniendo la veterinaria.' });
    }
};

// PATCH /api/vets/me — actualizar la vet del user autenticado.
export const updateMyVet = async (req, res) => {
    try {
        const b = req.body;
        const { rows: existingRows } = await pool.query(
            'SELECT id, slug FROM vets WHERE owner_user_id = $1',
            [req.user.id]
        );
        if (existingRows.length === 0) return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });
        const current = existingRows[0];

        // Slug editable pero manteniendo unicidad.
        let newSlug = current.slug;
        if (b.slug && slugify(b.slug) !== current.slug) {
            newSlug = await ensureUniqueSlug(slugify(b.slug));
        }

        // Solo se actualizan los campos que vienen en el body — patch parcial.
        const fields = [
            'name', 'email', 'phone', 'whatsapp', 'website', 'instagram',
            'address', 'city', 'country', 'lat', 'lng',
            'logo_url', 'cover_url', 'bio', 'hours', 'services',
        ];
        const sets = ['slug = $1'];
        const values = [newSlug];
        let i = 2;
        for (const f of fields) {
            if (b[f] !== undefined) {
                sets.push(`${f} = $${i}`);
                values.push(b[f]);
                i += 1;
            }
        }
        values.push(current.id);
        const { rows } = await pool.query(
            `UPDATE vets SET ${sets.join(', ')} WHERE id = $${i}
             RETURNING ${PUBLIC_COLUMNS}, approved, owner_user_id`,
            values
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('updateMyVet error:', error);
        res.status(500).json({ error: 'No se pudo actualizar la veterinaria.' });
    }
};

// DELETE /api/vets/me — borra la vet del user autenticado.
export const deleteMyVet = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM vets WHERE owner_user_id = $1 RETURNING id',
            [req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });
        res.json({ success: true });
    } catch (error) {
        console.error('deleteMyVet error:', error);
        res.status(500).json({ error: 'No se pudo eliminar la veterinaria.' });
    }
};

// GET /api/vets — directorio público (solo approved).
export const listVets = async (req, res) => {
    try {
        const { city, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let where = 'WHERE approved = TRUE';
        if (city) {
            params.push(city);
            where += ` AND LOWER(city) = LOWER($${params.length})`;
        }
        params.push(limit, offset);
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM vets ${where}
             ORDER BY verified_at DESC NULLS LAST, created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );
        const countParams = city ? [city] : [];
        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*)::int AS total FROM vets ${where.replace(/LIMIT[\s\S]*|OFFSET[\s\S]*/, '')}`,
            countParams
        );
        res.json({ vets: rows, total: countRows[0].total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('listVets error:', error);
        res.status(500).json({ error: 'Error listando veterinarias.' });
    }
};

// GET /api/vets/nearby — vets aprobadas cerca de un punto (haversine).
export const nearbyVets = async (req, res) => {
    try {
        const { lat, lng, radius_km = 15, limit = 20 } = req.query;
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS},
                (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
                    + sin(radians($1)) * sin(radians(lat)))) AS distance_km
             FROM vets
             WHERE approved = TRUE AND lat IS NOT NULL AND lng IS NOT NULL
                AND (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
                    + sin(radians($1)) * sin(radians(lat)))) <= $3
             ORDER BY distance_km ASC
             LIMIT $4`,
            [lat, lng, radius_km, limit]
        );
        res.json({ vets: rows });
    } catch (error) {
        console.error('nearbyVets error:', error);
        res.status(500).json({ error: 'Error buscando veterinarias cerca.' });
    }
};

// GET /api/vets/:slug — perfil público (solo approved).
export const getVetBySlug = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM vets WHERE slug = $1 AND approved = TRUE`,
            [req.params.slug]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Veterinaria no encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('getVetBySlug error:', error);
        res.status(500).json({ error: 'Error obteniendo la veterinaria.' });
    }
};

// GET /api/vets/admin/pending — lista de vets no aprobadas (admin).
export const listPendingVets = async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT v.id, v.slug, v.name, v.email, v.city, v.created_at, v.owner_user_id,
                    u.name AS owner_name, u.email AS owner_email
             FROM vets v
             LEFT JOIN users u ON u.id = v.owner_user_id
             WHERE v.approved = FALSE
             ORDER BY v.created_at ASC`
        );
        res.json({ vets: rows });
    } catch (error) {
        console.error('listPendingVets error:', error);
        res.status(500).json({ error: 'Error listando vets pendientes.' });
    }
};

// PATCH /api/vets/admin/:id/approve — aprobar o desaprobar (admin).
export const setVetApproval = async (req, res) => {
    try {
        const approved = req.body?.approved === true;
        const { rows } = await pool.query(
            `UPDATE vets
             SET approved = $1,
                 approved_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END
             WHERE id = $2
             RETURNING id, slug, name, approved, approved_at`,
            [approved, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Veterinaria no encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('setVetApproval error:', error);
        res.status(500).json({ error: 'No se pudo cambiar el estado de aprobación.' });
    }
};
