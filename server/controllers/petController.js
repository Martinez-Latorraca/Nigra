import pool from '../db.js';
import { generateEmbedding } from '../ai.js';
import { v2 as cloudinary } from 'cloudinary';

// CONFIGURACIÓN DE CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'pet_finder' },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        stream.end(buffer);
    });
};

export const getPetById = async (req, res) => {
    const id = req.params.pet_id;

    try {
        const query = `
            SELECT 
                p.*, 
                u.name AS reporter_name -- 👈 Traemos el nombre del que la reportó
            FROM pets p
            JOIN users u ON p.user_id = u.id -- 👈 Unimos con la tabla de usuarios
            WHERE p.id = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la mascota' });
    }
};

export const reportPet = async (req, res) => {
    try {
        // 1. Agregamos lat y lng a la extracción de datos
        const { description, status, contact_info, type, color, lat, lng, name } = req.body;

        console.log(req.files)

        // Verificamos que venga el archivo antes de intentar leer su buffer
        if (!req.files || !req.files['image']) {
            return res.status(400).send('Falta la imagen');
        }

        const imageBuffer = req.files['image'][0].buffer;
        const user_id = req.user.id;

        const vector = await generateEmbedding(imageBuffer);
        const vectorString = JSON.stringify(vector);

        const cloudinaryResult = await uploadToCloudinary(imageBuffer);
        const photoUrl = cloudinaryResult.secure_url;

        let extraPhotosUrls = [];

        if (req.files['extra_images'] && req.files['extra_images'].length > 0) {
            // Subimos todas las fotos extras en paralelo para ganar velocidad
            const uploadPromises = req.files['extra_images'].map(file =>
                uploadToCloudinary(file.buffer)
            );

            const cloudinaryResults = await Promise.all(uploadPromises);
            extraPhotosUrls = cloudinaryResults.map(result => result.secure_url);
        }

        const extraPhotosJson = JSON.stringify(extraPhotosUrls || []);




        const query = `
          INSERT INTO pets (
            description, status, contact_info, photo_url, 
            embedding, type, color, user_id, lat, lng, name, extra_photos
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, description, status, photo_url, name, extra_photos, created_at;
        `;

        // 3. Pasamos las coordenadas convertidas a números decimales
        const result = await pool.query(query, [
            description,
            status,
            contact_info,
            photoUrl,
            vectorString,
            type,
            color,
            user_id,
            lat ? parseFloat(lat) : null,
            lng ? parseFloat(lng) : null,
            name,
            extraPhotosJson

        ]);

        res.json({ success: true, pet: result.rows[0] });

    } catch (error) {
        console.error('Error procesando el reporte:', error);
        res.status(500).json({ error: 'Error procesando la solicitud' });
    }
};

export const searchPet = async (req, res) => {
    try {
        const { type, color, lat, lng, searchRatio, status } = req.body;

        if (!type || !color || !status) {
            return res.status(400).json({ error: 'Tipo, color y estado son requeridos' });
        }

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        const imageBuffer = req.file.buffer;
        const vector = await generateEmbedding(imageBuffer);
        const vectorString = JSON.stringify(vector);

        let query = '';
        let params = [];

        // 1. Solo le pedimos a la DB que ordene (sin el filtro estricto de IA en el WHERE)
        if (lat && lng) {
            const radioKm = parseFloat(searchRatio) || 10; // Radio de búsqueda en kilómetros, por defecto 10 km
            query = `
                SELECT p.id, p.description, p.photo_url, p.status, p.contact_info, p.type, p.color, p.lat, p.lng, p.name, 
                u.name AS reporter_name, u.id AS reporter_id, 
                (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) AS distance_km,
                (p.embedding <=> $7) AS visual_distance 
                FROM pets p
                JOIN users u ON p.user_id = u.id
                WHERE p.type = $3 
                AND p.color = $4
                AND p.status = $6
                AND p.lat IS NOT NULL 
                AND p.lng IS NOT NULL
                AND (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) <= $5
                ORDER BY p.embedding <=> $7
                LIMIT 10;
            `;
            params = [parseFloat(lat), parseFloat(lng), type, color, radioKm, status, vectorString];
        } else {
            query = `
                SELECT p.id, p.description, p.photo_url, p.status, p.contact_info, p.type, p.color, p.name,
                u.name AS reporter_name, u.id AS reporter_id,
                (p.embedding <=> $4) AS visual_distance 
                FROM pets p
                JOIN users u ON p.user_id = u.id
                WHERE p.type = $1 
                AND p.color = $2 
                AND p.status = $3
                ORDER BY p.embedding <=> $4
                LIMIT 10;
            `;
            params = [type, color, status, vectorString];
        }

        const result = await pool.query(query, params);


        const SIMILARITY_THRESHOLD = 0.2;

        // Filtramos el array descartando los que superen la distancia permitida
        const filteredResults = result.rows.filter(
            (pet) => {
                console.log("ID:", pet.id, "Visual:", pet.visual_distance, "Km:", pet.distance_km);
                // ¡CORRECCIÓN AQUÍ!
                return pet.visual_distance <= SIMILARITY_THRESHOLD;
            }
        );

        // 3. Devolvemos la lista limpia al Frontend
        res.json(filteredResults);
        console.log('Resultados encontrados:', filteredResults);


    } catch (error) {
        console.error('Error buscando mascotas:', error);
        res.status(500).json({ error: 'Error procesando la búsqueda' });
    }
};

export const deleteReport = async (req, res) => {
    try {
        const pet_id = req.params.id;
        const user_id = req.user.id;

        const result = await pool.query(
            'DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING *',
            [pet_id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado o no tienes permiso' });
        }

        res.json({ message: 'Reporte eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar reporte:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getAllPets = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;

        const { type, color, status, date } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (type && type !== 'all') {
            conditions.push(`type = $${paramIndex++}`);
            params.push(type);
        }
        if (color && color !== 'all') {
            conditions.push(`color = $${paramIndex++}`);
            params.push(color);
        }
        if (status && status !== 'all') {
            conditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        if (date && date !== 'all') {
            const intervals = { today: '1 day', week: '7 days', month: '30 days' };
            if (intervals[date]) {
                conditions.push(`created_at >= NOW() - INTERVAL '${intervals[date]}'`);
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM pets ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const query = `
            SELECT id, description, status, photo_url, type, color,
                   lat, lng, extra_photos, name, created_at
            FROM pets
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++};
        `;

        const result = await pool.query(query, [...params, limit, offset]);

        res.json({
            pets: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error("Error al obtener el feed de mascotas:", error);
        res.status(500).json({ error: 'Error al cargar las mascotas.' });
    }
};

export const getAvailableColors = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT color FROM pets WHERE color IS NOT NULL ORDER BY color'
        );
        res.json(result.rows.map(r => r.color));
    } catch (error) {
        console.error('Error al obtener colores:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};

export const getMyReports = async (req, res) => {
    try {
        const user_id = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM pets WHERE user_id = $1',
            [user_id]
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            'SELECT * FROM pets WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3',
            [user_id, limit, offset]
        );

        res.json({
            reports: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error al obtener mis reportes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
