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
        // Source of truth es `plan`, no `verified_at`. Antes usaba
        // `!!verified_at` pero el setVetPlan no actualiza verified_at si la
        // vet ya tenía uno, y cualquier UPDATE manual desde la DB salta el
        // trigger — quedaba is_sponsor=false para vets con plan sponsor_*.
        const isSponsor = vet.plan && vet.plan !== 'ally';

        // Modelo mental: vet = user + plus. Todo lo que reporta el owner de
        // la vet cuenta como reporte "de la vet" — no hay un flag
        // registered_by_vet_id que dependa de una UI de "reportar como vet".
        // La vet reporta como cualquier user; su dashboard agrega esas
        // publicaciones automáticamente.
        const { rows: statsRows } = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM pets WHERE user_id = $1) AS total_pets,
                (SELECT COUNT(*) FROM pets WHERE user_id = $1 AND resolved_at IS NOT NULL) AS resolved_pets,
                (SELECT COUNT(*) FROM notifications
                    WHERE user_id = $1 AND type IN ('nearby_vet_lost', 'nearby_vet_found')) AS total_alerts,
                (SELECT COUNT(*) FROM notifications
                    WHERE user_id = $1 AND type IN ('nearby_vet_lost', 'nearby_vet_found')
                          AND read_at IS NULL) AS unread_alerts`,
            [req.user.id]
        );
        const stats = statsRows[0];

        // Últimos pets publicados por el owner (max 5).
        const { rows: recentPets } = await pool.query(
            `SELECT id, status, photo_url, name, description, address,
                    resolved_at, created_at
             FROM pets
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [req.user.id]
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

        // Métricas de publicidad (últimos 30 días). Solo tiene sentido para
        // sponsors: los ally no aparecen como ad ni tienen tracking meaningful.
        // Devolvemos 0s para ally para que el frontend no rompa; oculta la
        // sección con is_sponsor.
        const { rows: adRows } = await pool.query(
            `SELECT kind, COUNT(*)::int AS n
             FROM vet_events
             WHERE vet_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
             GROUP BY kind`,
            [vet.id]
        );
        const adStats = {
            impressions: 0, ad_clicks: 0, contact_clicks: 0,
        };
        for (const row of adRows) {
            if (row.kind === 'impression') adStats.impressions = row.n;
            else if (row.kind === 'ad_click') adStats.ad_clicks = row.n;
            else if (row.kind === 'contact_click') adStats.contact_clicks = row.n;
        }

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
            ad_stats_30d: adStats,
            recent_pets: recentPets,
            recent_alerts: recentAlerts,
        });
    } catch (error) {
        console.error('getMyVetDashboard error:', error);
        res.status(500).json({ error: 'Error obteniendo el dashboard.' });
    }
};

// PATCH /api/vets/me/alerts — config de alertas por radio.
// El radio es de push notifications, no depende del plan de sponsor. El
// schema Joi ya lo limita a 1-50 km. Cualquier vet puede elegir libremente
// dentro de ese rango (igual que un user).
export const updateMyVetAlerts = async (req, res) => {
    try {
        const { receives_lost, receives_found, alert_radius_km } = req.body;
        const { rows: existingRows } = await pool.query(
            'SELECT id FROM vets WHERE owner_user_id = $1',
            [req.user.id]
        );
        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No tenés una veterinaria registrada.' });
        }
        const vet = existingRows[0];

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

// GET /api/vets — directorio público (solo approved). Filtros opcionales:
//   ?city=Montevideo
//   ?services=Consultas,Urgencias%2024h   (OR: la vet tiene AL MENOS uno)
//   ?lat=&lng=&radius_km=15                (haversine + ordena por distancia)
export const listVets = async (req, res) => {
    try {
        const { city, services, lat, lng, radius_km = 15, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Construimos WHERE + params compartidos entre query principal y count.
        // La query de count reusa los mismos filtros (menos limit/offset) para
        // que el total refleje exactamente los que se están viendo.
        const filterParams = [];
        let where = 'WHERE approved = TRUE AND deleted_at IS NULL';
        if (city) {
            filterParams.push(city);
            where += ` AND LOWER(city) = LOWER($${filterParams.length})`;
        }
        if (services) {
            const arr = String(services).split(',').map((s) => s.trim()).filter(Boolean);
            if (arr.length > 0) {
                filterParams.push(arr);
                // Postgres array overlap: coincide si tiene al menos uno.
                where += ` AND services && $${filterParams.length}::text[]`;
            }
        }
        if (lat != null && lng != null) {
            // Haversine en el WHERE + orden por distancia.
            filterParams.push(Number(lat), Number(lng), Number(radius_km));
            const iLat = filterParams.length - 2;
            const iLng = filterParams.length - 1;
            const iRad = filterParams.length;
            where += ` AND lat IS NOT NULL AND lng IS NOT NULL AND (6371 * acos(cos(radians($${iLat})) * cos(radians(lat)) * cos(radians(lng) - radians($${iLng})) + sin(radians($${iLat})) * sin(radians(lat)))) <= $${iRad}`;
        }

        // Ranking por tier: nation > pro > basic > ally. Los sponsors del
        // tier más alto aparecen primero — es el benefit principal del plan
        // pago. Ver [[project-vet-sponsor-model]]. Cuando hay geoloc, el
        // segundo criterio es distancia; sin geoloc, verified_at + created_at.
        const tierRank = `CASE plan
            WHEN 'sponsor_nation' THEN 3
            WHEN 'sponsor_pro'    THEN 2
            WHEN 'sponsor_basic'  THEN 1
            ELSE 0
        END`;
        const orderClause = (lat != null && lng != null)
            ? `ORDER BY ${tierRank} DESC, (6371 * acos(cos(radians($${filterParams.length - 2})) * cos(radians(lat)) * cos(radians(lng) - radians($${filterParams.length - 1})) + sin(radians($${filterParams.length - 2})) * sin(radians(lat)))) ASC`
            : `ORDER BY ${tierRank} DESC, verified_at DESC NULLS LAST, created_at DESC`;

        const listParams = [...filterParams, limit, offset];
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM vets ${where}
             ${orderClause}
             LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );
        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*)::int AS total FROM vets ${where}`,
            filterParams
        );
        res.json({ vets: rows, total: countRows[0].total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('listVets error:', error);
        res.status(500).json({ error: 'Error listando veterinarias.' });
    }
};

// GET /api/vets/ads — cards de publicidad para el feed. Solo sponsors
// (plan != 'ally'), approved + no deleted.
// - Con lat/lng: filtra por radio máx del tier (basic 5 / pro 20 / nation 50)
//   y ordena por tier DESC, distancia ASC. La vet nation llega más lejos.
// - Sin coords: no aplica radio, mix ponderado 50/30/20 por tier.
// Ver [[project-vet-sponsor-model]] para el modelo comercial.
export const listVetAds = async (req, res) => {
    try {
        const { lat, lng, limit = 8 } = req.query;
        const cappedLimit = Math.min(Math.max(1, Number(limit) || 8), 20);
        const hasGeo = lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

        const baseWhere = `
            WHERE approved = TRUE
              AND deleted_at IS NULL
              AND plan <> 'ally'
        `;

        // Ranking por tier: nation > pro > basic > cualquier otro sponsor > ally.
        // ally está excluido en el WHERE pero lo dejo en el CASE por si el
        // campo aparece con planes desconocidos.
        const tierRankExpr = `
            CASE plan
                WHEN 'sponsor_nation' THEN 3
                WHEN 'sponsor_pro'    THEN 2
                WHEN 'sponsor_basic'  THEN 1
                ELSE 0
            END
        `;

        // Cap de alcance por tier (km). Fijo — no configurable por vet.
        // Debe coincidir con SPONSOR_TIERS.adRadiusKm en el frontend.
        const tierRadiusExpr = `
            CASE plan
                WHEN 'sponsor_nation' THEN 50
                WHEN 'sponsor_pro'    THEN 20
                WHEN 'sponsor_basic'  THEN 5
                ELSE 0
            END
        `;

        if (hasGeo) {
            // Con geoloc: filtra por cap del tier, después tier DESC + distancia.
            // Nation ve users hasta 50km, pro 20, basic 5. Con esto un basic
            // cerca puede aparecer sobre un nation lejano solo si el nation
            // está fuera de 50km (que ya lo excluye el WHERE de todas formas).
            const { rows } = await pool.query(
                `SELECT ${PUBLIC_COLUMNS},
                    (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
                        + sin(radians($1)) * sin(radians(lat)))) AS distance_km
                 FROM vets
                 ${baseWhere}
                   AND lat IS NOT NULL AND lng IS NOT NULL
                   AND (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2))
                        + sin(radians($1)) * sin(radians(lat)))) <= ${tierRadiusExpr}
                 ORDER BY ${tierRankExpr} DESC, distance_km ASC
                 LIMIT $3`,
                [Number(lat), Number(lng), cappedLimit]
            );
            return res.json({ vets: rows });
        }

        // Sin geoloc: mix ponderado 50/30/20 nation/pro/basic. Garantiza que
        // los 3 tiers tengan visibilidad — sin este mix, nation dominaría
        // todos los slots hasta agotarse y basic nunca aparecería. Rellena
        // huecos entre tiers si algún nivel está vacío.
        const nationSlots = Math.ceil(cappedLimit * 0.5);
        const proSlots    = Math.ceil(cappedLimit * 0.3);
        const basicSlots  = cappedLimit - nationSlots - proSlots;

        const fetchTier = (plan, take) => take <= 0
            ? Promise.resolve({ rows: [] })
            : pool.query(
                `SELECT ${PUBLIC_COLUMNS} FROM vets
                 WHERE approved = TRUE AND deleted_at IS NULL AND plan = $1
                 ORDER BY random()
                 LIMIT $2`,
                [plan, take]
            );

        const [nRes, pRes, bRes] = await Promise.all([
            fetchTier('sponsor_nation', nationSlots),
            fetchTier('sponsor_pro',    proSlots),
            fetchTier('sponsor_basic',  basicSlots),
        ]);

        // Rebalanceo: si algún tier trajo menos de lo pedido, rellenamos con
        // los otros por tier DESC para no desperdiciar slots.
        let picked = [...nRes.rows, ...pRes.rows, ...bRes.rows];
        if (picked.length < cappedLimit) {
            const already = new Set(picked.map((v) => v.id));
            const { rows: extra } = await pool.query(
                `SELECT ${PUBLIC_COLUMNS} FROM vets
                 ${baseWhere}
                   AND id <> ALL($1::int[])
                 ORDER BY ${tierRankExpr} DESC, random()
                 LIMIT $2`,
                [picked.map((v) => v.id), cappedLimit - picked.length]
            );
            picked = picked.concat(extra);
        }

        res.json({ vets: picked.slice(0, cappedLimit) });
    } catch (error) {
        console.error('listVetAds error:', error);
        res.status(500).json({ error: 'Error obteniendo publicidad.' });
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

// Planes válidos. El admin promueve/degrada moviendo entre estos valores.
// El ranking del feed de ads (listVetAds) trata a los sponsor_* con pesos:
//   sponsor_nation=3 > sponsor_pro=2 > sponsor_basic=1 > ally=0
export const VALID_PLANS = ['ally', 'sponsor_basic', 'sponsor_pro', 'sponsor_nation'];

// GET /api/vets/admin/active — todas las vets aprobadas (admin), con plan
// actual + owner. Se usa desde el AdminPanel para gestionar upgrades.
export const listActiveVets = async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT v.id, v.slug, v.name, v.email, v.city, v.plan, v.created_at,
                    v.approved_at, v.owner_user_id,
                    u.name AS owner_name, u.email AS owner_email
             FROM vets v
             LEFT JOIN users u ON u.id = v.owner_user_id
             WHERE v.approved = TRUE AND v.deleted_at IS NULL
             ORDER BY
                CASE v.plan
                    WHEN 'sponsor_nation' THEN 3
                    WHEN 'sponsor_pro'    THEN 2
                    WHEN 'sponsor_basic'  THEN 1
                    ELSE 0
                END DESC,
                v.approved_at DESC NULLS LAST`
        );
        res.json({ vets: rows });
    } catch (error) {
        console.error('listActiveVets error:', error);
        res.status(500).json({ error: 'Error listando vets activas.' });
    }
};

// PATCH /api/vets/admin/:id/plan — cambia el plan de una vet (admin).
// El alta de un sponsor es MANUAL: la vet contacta a Nico, arreglan pago
// afuera, y él sube el plan desde este endpoint.
// Ver [[project-vet-sponsor-model]].
export const setVetPlan = async (req, res) => {
    try {
        const { plan } = req.body || {};
        if (!VALID_PLANS.includes(plan)) {
            return res.status(400).json({
                error: `plan inválido. Válidos: ${VALID_PLANS.join(', ')}.`,
            });
        }
        // verified_at marca a la vet como "socio" para el badge dorado en el
        // directorio y en las cards. Se setea la primera vez que sube a
        // sponsor_* y se limpia si vuelve a ally.
        const isSponsor = plan !== 'ally';
        const { rows } = await pool.query(
            `UPDATE vets
             SET plan = $1,
                 verified_at = CASE
                    WHEN $2 = TRUE AND verified_at IS NULL THEN NOW()
                    WHEN $2 = FALSE THEN NULL
                    ELSE verified_at
                 END
             WHERE id = $3
             RETURNING id, slug, name, plan, verified_at`,
            [plan, isSponsor, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Veterinaria no encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('setVetPlan error:', error);
        res.status(500).json({ error: 'No se pudo cambiar el plan.' });
    }
};

// POST /api/vets/:id/click — trackea un tap en la ad card del feed.
// Público (no auth): el user puede o no estar logueado. Un abusive script
// puede inflar counts, pero para MVP no hay dedupe ni rate limit.
export const trackAdClick = async (req, res) => {
    try {
        const vetId = Number(req.params.id);
        if (!Number.isInteger(vetId) || vetId <= 0) {
            return res.status(400).json({ error: 'vet_id inválido.' });
        }
        await pool.query(
            `INSERT INTO vet_events (vet_id, kind) VALUES ($1, 'ad_click')`,
            [vetId]
        );
        res.status(204).end();
    } catch (error) {
        console.error('trackAdClick error:', error);
        // Analytics no debe romper UX. Devolvemos 204 igual.
        res.status(204).end();
    }
};

// POST /api/vets/:id/contact-click — tap en un contacto del perfil (WA / tel / IG / web).
// Mismo tratamiento que trackAdClick.
export const trackContactClick = async (req, res) => {
    try {
        const vetId = Number(req.params.id);
        if (!Number.isInteger(vetId) || vetId <= 0) {
            return res.status(400).json({ error: 'vet_id inválido.' });
        }
        await pool.query(
            `INSERT INTO vet_events (vet_id, kind) VALUES ($1, 'contact_click')`,
            [vetId]
        );
        res.status(204).end();
    } catch (error) {
        console.error('trackContactClick error:', error);
        res.status(204).end();
    }
};

// POST /api/vets/events/impressions — batch de impresiones (cards que entraron
// al viewport). Body: { vet_ids: [1,2,3] }. Frontend deduplica por sesión.
export const trackImpressions = async (req, res) => {
    try {
        const { vet_ids: vetIds } = req.body || {};
        if (!Array.isArray(vetIds) || vetIds.length === 0) return res.status(204).end();
        const clean = vetIds
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n > 0);
        if (clean.length === 0) return res.status(204).end();
        // unnest: 1 fila por vet_id sin armar N placeholders.
        await pool.query(
            `INSERT INTO vet_events (vet_id, kind)
             SELECT UNNEST($1::int[]), 'impression'`,
            [clean]
        );
        res.status(204).end();
    } catch (error) {
        console.error('trackImpressions error:', error);
        res.status(204).end();
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
