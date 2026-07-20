import pool from '../db.js';
import { slugify, ensureUniqueVetSlug } from '../utils/slug.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';

const PUBLIC_COLUMNS = `
    id, slug, name, email, phone, whatsapp, website, instagram,
    address, city, country, lat, lng, logo_url, cover_url, bio,
    hours, services, plan, verified_at, created_at
`;

const ensureUniqueSlug = (base) => ensureUniqueVetSlug(pool, base);

// POST /api/vets — auto-registro del user actual como owner. 409 si ya tiene una.
// Si el body no trae email, usamos el email del user (login) como contacto
// público — simplifica el flow de registro y evita al user tener que ingresar
// el mismo mail dos veces.
export const createVet = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const existing = await pool.query('SELECT id FROM vets WHERE owner_user_id = $1', [ownerId]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya tenés una veterinaria registrada.' });
        }

        const b = req.body;
        let vetEmail = b.email || null;
        if (!vetEmail) {
            const { rows: userRows } = await pool.query(
                'SELECT email FROM users WHERE id = $1',
                [ownerId]
            );
            vetEmail = userRows[0]?.email || null;
        }
        const slug = await ensureUniqueSlug(b.slug ? slugify(b.slug) : slugify(b.name));

        const result = await pool.query(
            `INSERT INTO vets (
                slug, name, owner_user_id, email, phone, whatsapp, website, instagram,
                address, city, country, lat, lng, logo_url, cover_url, bio, hours, services
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
            ) RETURNING ${PUBLIC_COLUMNS}, approved, owner_user_id`,
            [
                slug, b.name, ownerId, vetEmail, b.phone || null, b.whatsapp || null,
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

// POST /api/vets/me/image — sube imagen a Cloudinary y actualiza logo_url/cover_url.
// Body: multipart con `image` (file) y `field` ('logo' | 'cover').
export const uploadMyVetImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Falta la imagen.' });
        const field = req.body.field;
        if (field !== 'logo' && field !== 'cover') {
            return res.status(400).json({ error: 'field debe ser "logo" o "cover".' });
        }

        const { rows: vetRows } = await pool.query(
            'SELECT id FROM vets WHERE owner_user_id = $1',
            [req.user.id]
        );
        if (vetRows.length === 0) return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });

        const result = await uploadBufferToCloudinary(req.file.buffer, 'mimo/vets');
        const url = result.secure_url;
        const column = field === 'logo' ? 'logo_url' : 'cover_url';

        const { rows } = await pool.query(
            `UPDATE vets SET ${column} = $1 WHERE id = $2 RETURNING ${column}`,
            [url, vetRows[0].id]
        );
        res.json({ [column]: rows[0][column] });
    } catch (error) {
        console.error('uploadMyVetImage error:', error);
        res.status(500).json({ error: 'No se pudo subir la imagen.' });
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

// GET /api/vets/me/dashboard — resumen para el owner de la vet:
// stats agregados, últimas alertas recibidas y últimos pets publicados.
export const getMyVetDashboard = async (req, res) => {
    try {
        const { rows: vetRows } = await pool.query(
            `SELECT id, name, slug, plan, verified_at, approved,
                    receives_lost, receives_found, alert_radius_km, logo_url
             FROM vets WHERE owner_user_id = $1`,
            [req.user.id]
        );
        if (vetRows.length === 0) {
            return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });
        }
        const vet = vetRows[0];
        const isSponsor = !!vet.verified_at;

        // Métricas agregadas: pets publicados on-behalf-of, resueltos, alertas.
        const { rows: statsRows } = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM pets WHERE registered_by_vet_id = $1) AS total_pets,
                (SELECT COUNT(*) FROM pets WHERE registered_by_vet_id = $1 AND resolved_at IS NOT NULL) AS resolved_pets,
                (SELECT COUNT(*) FROM notifications
                    WHERE user_id = $2 AND type IN ('nearby_vet_lost', 'nearby_vet_found')) AS total_alerts,
                (SELECT COUNT(*) FROM notifications
                    WHERE user_id = $2 AND type IN ('nearby_vet_lost', 'nearby_vet_found')
                          AND read_at IS NULL) AS unread_alerts`,
            [vet.id, req.user.id]
        );
        const stats = statsRows[0];

        // Últimos pets publicados por la vet (max 5).
        const { rows: recentPets } = await pool.query(
            `SELECT id, status, photo_url, name, description, address,
                    resolved_at, created_at
             FROM pets
             WHERE registered_by_vet_id = $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [vet.id]
        );

        // Últimas alertas recibidas por la vet (max 5).
        const { rows: recentAlerts } = await pool.query(
            `SELECT n.id, n.type, n.data, n.read_at, n.created_at,
                    p.photo_url AS pet_photo, p.name AS pet_name,
                    p.address AS pet_address, p.status AS pet_status
             FROM notifications n
             LEFT JOIN pets p ON p.id = (n.data->>'pet_id')::int
             WHERE n.user_id = $1 AND n.type IN ('nearby_vet_lost', 'nearby_vet_found')
             ORDER BY n.created_at DESC
             LIMIT 5`,
            [req.user.id]
        );

        res.json({
            vet: {
                id: vet.id, name: vet.name, slug: vet.slug, plan: vet.plan,
                approved: vet.approved, is_sponsor: isSponsor,
                logo_url: vet.logo_url,
                receives_lost: vet.receives_lost, receives_found: vet.receives_found,
                alert_radius_km: vet.alert_radius_km,
            },
            stats: {
                total_pets: Number(stats.total_pets),
                resolved_pets: Number(stats.resolved_pets),
                total_alerts: Number(stats.total_alerts),
                unread_alerts: Number(stats.unread_alerts),
            },
            recent_pets: recentPets,
            recent_alerts: recentAlerts,
        });
    } catch (error) {
        console.error('getMyVetDashboard error:', error);
        res.status(500).json({ error: 'Error obteniendo el dashboard.' });
    }
};

// PATCH /api/vets/me/alerts — config de alertas por radio.
// Gate por plan: ally = radio máximo 5km. Sponsors escalan según plan.
export const updateMyVetAlerts = async (req, res) => {
    try {
        const { receives_lost, receives_found, alert_radius_km } = req.body;
        const { rows: existingRows } = await pool.query(
            'SELECT id, plan FROM vets WHERE owner_user_id = $1',
            [req.user.id]
        );
        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });
        }
        const vet = existingRows[0];

        if (alert_radius_km !== undefined) {
            const cap = vet.plan === 'ally' ? 5 : 50;
            if (alert_radius_km > cap) {
                return res.status(403).json({
                    error: `Tu plan actual permite un radio máximo de ${cap} km.`,
                });
            }
        }

        const sets = [];
        const values = [];
        let i = 1;
        for (const [field, value] of Object.entries({
            receives_lost, receives_found, alert_radius_km,
        })) {
            if (value !== undefined) {
                sets.push(`${field} = $${i}`);
                values.push(value);
                i += 1;
            }
        }
        values.push(vet.id);

        const { rows } = await pool.query(
            `UPDATE vets SET ${sets.join(', ')} WHERE id = $${i}
             RETURNING id, receives_lost, receives_found, alert_radius_km, plan`,
            values
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('updateMyVetAlerts error:', error);
        res.status(500).json({ error: 'No se pudo actualizar la config de alertas.' });
    }
};

// GET /api/vets — directorio público (solo approved).
export const listVets = async (req, res) => {
    try {
        const { city, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let where = 'WHERE approved = TRUE AND deleted_at IS NULL';
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
             WHERE approved = TRUE AND deleted_at IS NULL AND lat IS NOT NULL AND lng IS NOT NULL
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
            `SELECT ${PUBLIC_COLUMNS} FROM vets WHERE slug = $1 AND approved = TRUE AND deleted_at IS NULL`,
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
