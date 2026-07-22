import pool from '../db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';

// Devuelve nombre + coords del shelter para las cards (evita segundo fetch).
const PUBLIC_COLUMNS = `
    ap.id, ap.shelter_id, ap.name, ap.species, ap.sex, ap.age_group, ap.size,
    ap.color, ap.description, ap.vaccinated, ap.neutered, ap.photos,
    ap.created_at, ap.adopted_at,
    s.name AS shelter_name, s.slug AS shelter_slug, s.city AS shelter_city,
    s.lat AS shelter_lat, s.lng AS shelter_lng, s.logo_url AS shelter_logo
`;

// POST /api/adoption-pets — el shelter publica una nueva mascota en adopción.
// req.shelter viene de requireShelter.
export const createAdoptionPet = async (req, res) => {
    try {
        const b = req.body;
        const { rows } = await pool.query(
            `INSERT INTO adoption_pets (
                shelter_id, name, species, sex, age_group, size, color,
                description, vaccinated, neutered, photos
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
             RETURNING id, shelter_id, name, species, sex, age_group, size,
                color, description, vaccinated, neutered, photos, created_at`,
            [
                req.shelter.id,
                b.name || null,
                b.species,
                b.sex || null,
                b.age_group || null,
                b.size || null,
                b.color || null,
                b.description || null,
                !!b.vaccinated,
                !!b.neutered,
                JSON.stringify(b.photos),
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('createAdoptionPet error:', error);
        res.status(500).json({ error: 'No se pudo crear la publicación.' });
    }
};

// PATCH /api/adoption-pets/:id — solo si el pet pertenece al shelter caller.
export const updateAdoptionPet = async (req, res) => {
    try {
        const b = req.body;
        const petId = Number(req.params.id);

        const { rows: petRows } = await pool.query(
            `SELECT id FROM adoption_pets WHERE id = $1 AND shelter_id = $2 AND deleted_at IS NULL`,
            [petId, req.shelter.id]
        );
        if (petRows.length === 0) return res.status(404).json({ error: 'Publicación no encontrada.' });

        const fields = [
            'name', 'species', 'sex', 'age_group', 'size', 'color',
            'description', 'vaccinated', 'neutered', 'photos',
        ];
        const sets = [];
        const values = [];
        let i = 1;
        for (const f of fields) {
            if (b[f] !== undefined) {
                if (f === 'photos') {
                    sets.push(`${f} = $${i}::jsonb`);
                    values.push(JSON.stringify(b[f]));
                } else {
                    sets.push(`${f} = $${i}`);
                    values.push(b[f]);
                }
                i += 1;
            }
        }
        if (sets.length === 0) return res.status(400).json({ error: 'No hay cambios.' });
        values.push(petId);
        const { rows } = await pool.query(
            `UPDATE adoption_pets SET ${sets.join(', ')} WHERE id = $${i}
             RETURNING id, shelter_id, name, species, sex, age_group, size,
                color, description, vaccinated, neutered, photos, created_at, adopted_at`,
            values
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('updateAdoptionPet error:', error);
        res.status(500).json({ error: 'No se pudo actualizar.' });
    }
};

// POST /api/adoption-pets/:id/adopted — marca adoptado.
export const markAdopted = async (req, res) => {
    try {
        const petId = Number(req.params.id);
        const { rows } = await pool.query(
            `UPDATE adoption_pets SET adopted_at = NOW()
             WHERE id = $1 AND shelter_id = $2 AND deleted_at IS NULL AND adopted_at IS NULL
             RETURNING id, adopted_at`,
            [petId, req.shelter.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Publicación no encontrada o ya adoptada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('markAdopted error:', error);
        res.status(500).json({ error: 'No se pudo marcar como adoptado.' });
    }
};

// DELETE /api/adoption-pets/:id — soft delete.
export const deleteAdoptionPet = async (req, res) => {
    try {
        const petId = Number(req.params.id);
        const { rows } = await pool.query(
            `UPDATE adoption_pets SET deleted_at = NOW()
             WHERE id = $1 AND shelter_id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [petId, req.shelter.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Publicación no encontrada.' });
        res.json({ success: true });
    } catch (error) {
        console.error('deleteAdoptionPet error:', error);
        res.status(500).json({ error: 'No se pudo eliminar.' });
    }
};

// POST /api/adoption-pets/upload-photo — sube una foto y devuelve la URL.
// El frontend arma el array `photos` con las URLs devueltas y hace el POST/PATCH.
export const uploadAdoptionPetPhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Falta la foto.' });
        const result = await uploadBufferToCloudinary(req.file.buffer, 'mimo/adoption');
        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('uploadAdoptionPetPhoto error:', error);
        res.status(500).json({ error: 'No se pudo subir la foto.' });
    }
};

// GET /api/adoption-pets — feed público con filtros.
export const listAdoptionPets = async (req, res) => {
    try {
        const {
            species, sex, age_group, size, city, shelter_id, include_adopted,
            page = 1, limit = 20,
        } = req.query;
        const offset = (page - 1) * limit;

        const filterParams = [];
        let where = 'WHERE ap.deleted_at IS NULL AND s.approved = TRUE AND s.deleted_at IS NULL';
        if (!include_adopted) where += ' AND ap.adopted_at IS NULL';
        const pushEq = (col, value) => {
            filterParams.push(value);
            where += ` AND ${col} = $${filterParams.length}`;
        };
        if (species)    pushEq('ap.species', species);
        if (sex)        pushEq('ap.sex', sex);
        if (age_group)  pushEq('ap.age_group', age_group);
        if (size)       pushEq('ap.size', size);
        if (shelter_id) pushEq('ap.shelter_id', Number(shelter_id));
        if (city) {
            filterParams.push(city);
            where += ` AND LOWER(s.city) = LOWER($${filterParams.length})`;
        }

        const listParams = [...filterParams, limit, offset];
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS}
             FROM adoption_pets ap
             JOIN shelters s ON s.id = ap.shelter_id
             ${where}
             ORDER BY ap.created_at DESC
             LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );
        const { rows: countRows } = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM adoption_pets ap
             JOIN shelters s ON s.id = ap.shelter_id
             ${where}`,
            filterParams
        );
        res.json({ pets: rows, total: countRows[0].total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('listAdoptionPets error:', error);
        res.status(500).json({ error: 'Error listando adopciones.' });
    }
};

// GET /api/adoption-pets/:id — detalle público.
export const getAdoptionPet = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT ${PUBLIC_COLUMNS},
                s.phone AS shelter_phone, s.whatsapp AS shelter_whatsapp,
                s.email AS shelter_email, s.instagram AS shelter_instagram,
                s.website AS shelter_website, s.address AS shelter_address
             FROM adoption_pets ap
             JOIN shelters s ON s.id = ap.shelter_id
             WHERE ap.id = $1 AND ap.deleted_at IS NULL
               AND s.approved = TRUE AND s.deleted_at IS NULL`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Publicación no encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('getAdoptionPet error:', error);
        res.status(500).json({ error: 'Error obteniendo la publicación.' });
    }
};

// GET /api/adoption-pets/mine — el shelter caller lista sus publicaciones,
// incluyendo adoptadas y soft-deleted (para historial). Requiere requireShelter.
export const listMyAdoptionPets = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, shelter_id, name, species, sex, age_group, size,
                color, description, vaccinated, neutered, photos,
                created_at, adopted_at, deleted_at
             FROM adoption_pets
             WHERE shelter_id = $1
             ORDER BY created_at DESC`,
            [req.shelter.id]
        );
        res.json({ pets: rows });
    } catch (error) {
        console.error('listMyAdoptionPets error:', error);
        res.status(500).json({ error: 'Error listando tus publicaciones.' });
    }
};
