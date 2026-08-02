import pool from '../db.js';
import { slugify } from '../utils/slug.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';

// Columnas públicas del directorio de refugios.
//
// NO incluye dirección ni coordenadas, a diferencia de las veterinarias.
// Una veterinaria es un comercio que quiere que la encuentres; un refugio es
// habitualmente la casa de alguien, con animales adentro. Publicar su
// ubicación exacta expone a las personas y a los animales (abandonos en la
// puerta, robos, hostigamiento) además del problema legal.
//
// `city` sí queda: granularidad de ciudad, sirve para filtrar el directorio y
// no identifica un domicilio. El contacto va por teléfono/whatsapp/mail/redes,
// así que el refugio decide a quién le pasa la dirección y cuándo.
//
// Ojo si se vuelve a tocar: ocultar `address` pero exponer `lat`/`lng` no
// sirve de nada — las coordenadas son MÁS precisas que la dirección escrita.
const PUBLIC_COLUMNS = `
    id, slug, name, email, phone, whatsapp, website, instagram,
    city, country, logo_url, cover_url, bio,
    hours, created_at
`;

// Chequea unicidad del slug en `shelters` (paralelo a la helper de vets).
const ensureUniqueSlug = async (base) => {
    let candidate = base;
    let i = 1;
    // Loop simple con LIMIT 1. La colisión real es rara — un shelter por owner.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { rows } = await pool.query('SELECT 1 FROM shelters WHERE slug = $1 LIMIT 1', [candidate]);
        if (rows.length === 0) return candidate;
        i += 1;
        candidate = `${base}-${i}`;
    }
};

// POST /api/shelters — auto-registro del user actual como owner.
export const createShelter = async (req, res) => {
    try {
        const ownerId = req.user.id;
        const existing = await pool.query(
            'SELECT id FROM shelters WHERE owner_user_id = $1 AND deleted_at IS NULL',
            [ownerId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya tenés un refugio registrado.' });
        }

        const b = req.body;
        let shelterEmail = b.email || null;
        if (!shelterEmail) {
            const { rows: userRows } = await pool.query(
                'SELECT email FROM users WHERE id = $1',
                [ownerId]
            );
            shelterEmail = userRows[0]?.email || null;
        }
        const slug = await ensureUniqueSlug(b.slug ? slugify(b.slug) : slugify(b.name));

        // No se piden dirección ni coordenadas: no se guarda lo que no se
        // quiere exponer. Las columnas siguen existiendo en la tabla (vienen
        // del schema original) pero quedan siempre NULL.
        const result = await pool.query(
            `INSERT INTO shelters (
                slug, name, owner_user_id, email, phone, whatsapp, website, instagram,
                city, country, logo_url, cover_url, bio, hours
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
            ) RETURNING ${PUBLIC_COLUMNS}, approved, owner_user_id`,
            [
                slug, b.name, ownerId, shelterEmail, b.phone || null, b.whatsapp || null,
                b.website || null, b.instagram || null, b.city || null,
                b.country || 'UY', b.logo_url || null,
                b.cover_url || null, b.bio || null, b.hours || null,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('createShelter error:', error);
        res.status(500).json({ error: 'No se pudo crear el refugio.' });
    }
};

// GET /api/shelters/me
export const getMyShelter = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS}, approved, owner_user_id
             FROM shelters WHERE owner_user_id = $1 AND deleted_at IS NULL`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'No tenés un refugio registrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('getMyShelter error:', error);
        res.status(500).json({ error: 'Error obteniendo el refugio.' });
    }
};

// PATCH /api/shelters/me — patch parcial de campos.
export const updateMyShelter = async (req, res) => {
    try {
        const b = req.body;
        const { rows: existingRows } = await pool.query(
            'SELECT id, slug FROM shelters WHERE owner_user_id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );
        if (existingRows.length === 0) return res.status(404).json({ error: 'No tenés un refugio registrado.' });
        const current = existingRows[0];

        let newSlug = current.slug;
        if (b.slug && slugify(b.slug) !== current.slug) {
            newSlug = await ensureUniqueSlug(slugify(b.slug));
        }

        // 'address', 'lat' y 'lng' quedan FUERA a propósito: aunque alguien
        // los mande en el body, no se guardan (ver PUBLIC_COLUMNS).
        const fields = [
            'name', 'email', 'phone', 'whatsapp', 'website', 'instagram',
            'city', 'country',
            'logo_url', 'cover_url', 'bio', 'hours',
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
            `UPDATE shelters SET ${sets.join(', ')} WHERE id = $${i}
             RETURNING ${PUBLIC_COLUMNS}, approved, owner_user_id`,
            values
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('updateMyShelter error:', error);
        res.status(500).json({ error: 'No se pudo actualizar el refugio.' });
    }
};

// POST /api/shelters/me/image — logo o cover.
export const uploadMyShelterImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Falta la imagen.' });
        const field = req.body.field;
        if (field !== 'logo' && field !== 'cover') {
            return res.status(400).json({ error: 'field debe ser "logo" o "cover".' });
        }
        const { rows: shelterRows } = await pool.query(
            'SELECT id FROM shelters WHERE owner_user_id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );
        if (shelterRows.length === 0) return res.status(404).json({ error: 'No tenés un refugio registrado.' });

        const result = await uploadBufferToCloudinary(req.file.buffer, 'mimo/shelters');
        const url = result.secure_url;
        const column = field === 'logo' ? 'logo_url' : 'cover_url';

        const { rows } = await pool.query(
            `UPDATE shelters SET ${column} = $1 WHERE id = $2 RETURNING ${column}`,
            [url, shelterRows[0].id]
        );
        res.json({ [column]: rows[0][column] });
    } catch (error) {
        console.error('uploadMyShelterImage error:', error);
        res.status(500).json({ error: 'No se pudo subir la imagen.' });
    }
};

// DELETE /api/shelters/me — soft delete (deleted_at = NOW).
export const deleteMyShelter = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE shelters SET deleted_at = NOW()
             WHERE owner_user_id = $1 AND deleted_at IS NULL
             RETURNING id`,
            [req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'No tenés un refugio registrado.' });
        res.json({ success: true });
    } catch (error) {
        console.error('deleteMyShelter error:', error);
        res.status(500).json({ error: 'No se pudo eliminar el refugio.' });
    }
};

// GET /api/shelters — directorio público. Filtro: city.
//
// Se quitó el filtro por lat/lng+radius_km que había acá. No solo era código
// muerto (ningún cliente lo llamaba y los refugios nunca cargaron
// coordenadas): un filtro por radio es un oráculo de ubicación. Repitiendo
// consultas con distintos centros y radios se triangula el domicilio sin que
// la API devuelva nunca una coordenada. Filtrar por ciudad da lo mismo a
// efectos prácticos y no permite eso.
export const listShelters = async (req, res) => {
    try {
        const { city, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const filterParams = [];
        let where = 'WHERE approved = TRUE AND deleted_at IS NULL';
        if (city) {
            filterParams.push(city);
            where += ` AND LOWER(city) = LOWER($${filterParams.length})`;
        }
        const orderClause = 'ORDER BY created_at DESC';

        const listParams = [...filterParams, limit, offset];
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM shelters ${where}
             ${orderClause}
             LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );
        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*)::int AS total FROM shelters ${where}`,
            filterParams
        );
        res.json({ shelters: rows, total: countRows[0].total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('listShelters error:', error);
        res.status(500).json({ error: 'Error listando refugios.' });
    }
};

// GET /api/shelters/:slug — perfil público.
export const getShelterBySlug = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM shelters
             WHERE slug = $1 AND approved = TRUE AND deleted_at IS NULL`,
            [req.params.slug]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Refugio no encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('getShelterBySlug error:', error);
        res.status(500).json({ error: 'Error obteniendo el refugio.' });
    }
};

// GET /api/shelters/admin/pending — admin.
export const listPendingShelters = async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT s.id, s.slug, s.name, s.email, s.city, s.created_at, s.owner_user_id,
                    u.name AS owner_name, u.email AS owner_email
             FROM shelters s
             LEFT JOIN users u ON u.id = s.owner_user_id
             WHERE s.approved = FALSE AND s.deleted_at IS NULL
             ORDER BY s.created_at ASC`
        );
        res.json({ shelters: rows });
    } catch (error) {
        console.error('listPendingShelters error:', error);
        res.status(500).json({ error: 'Error listando refugios pendientes.' });
    }
};

// PATCH /api/shelters/admin/:id/approve — admin.
export const setShelterApproval = async (req, res) => {
    try {
        const approved = req.body?.approved === true;
        const { rows } = await pool.query(
            `UPDATE shelters
             SET approved = $1,
                 approved_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END
             WHERE id = $2
             RETURNING id, slug, name, approved, approved_at`,
            [approved, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Refugio no encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('setShelterApproval error:', error);
        res.status(500).json({ error: 'No se pudo cambiar la aprobación.' });
    }
};
