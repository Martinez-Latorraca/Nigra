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
        const { description, status, contact_info, type, color, lat, lng } = req.body;

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

        // 2. Agregamos lat y lng al INSERT y a los VALUES ($9, $10)
        const query = `
          INSERT INTO pets (
            description, status, contact_info, photo_url, 
            embedding, type, color, user_id, lat, lng, extra_photos
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, description, photo_url, extra_photos, created_at;
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
            extraPhotosUrls

        ]);

        res.json({ success: true, pet: result.rows[0] });

    } catch (error) {
        console.error('Error procesando el reporte:', error);
        res.status(500).json({ error: 'Error procesando la solicitud' });
    }
};

export const searchPet = async (req, res) => {
    try {
        const { type, color, lat, lng, searchRatio } = req.body;

        if (!req.file || !req.file.buffer) {
            return res.status(400).send('Falta la imagen');
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
                SELECT p.id, p.description, p.photo_url, p.status, p.contact_info, p.type, p.color, p.lat, p.lng,
                u.name AS reporter_name, u.id AS reporter_id, 
                (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) AS distance_km,
                (p.embedding <=> $6) AS visual_distance 
                FROM pets p
                JOIN users u ON p.user_id = u.id
                WHERE p.type = $3 
                AND p.color = $4
                AND p.lat IS NOT NULL 
                AND p.lng IS NOT NULL
                AND (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) <= $5
                ORDER BY p.embedding <=> $6 
                LIMIT 10;
            `;
            params = [parseFloat(lat), parseFloat(lng), type, color, radioKm, vectorString];
        } else {
            query = `
                SELECT p.id, p.description, p.photo_url, p.status, p.contact_info, p.type, p.color,
                u.name AS reporter_name, u.id AS reporter_id,
                (p.embedding <=> $3) AS visual_distance 
                FROM pets p
                JOIN users u ON p.user_id = u.id
                WHERE p.type = $1 AND p.color = $2
                ORDER BY p.embedding <=> $3
                LIMIT 10;
            `;
            params = [type, color, vectorString];
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
        // 1. Pedimos todo, asegurándonos de traer created_at
        // 2. Ordenamos por fecha (DESC = de más nuevo a más viejo)
        const query = `
            SELECT 
                id, 
                description, 
                status, 
                photo_url, 
                type, 
                color, 
                lat, 
                lng, 
                extra_photos, 
                created_at 
            FROM pets 
            ORDER BY created_at DESC;
        `;

        const result = await pool.query(query);

        // Enviamos los resultados al frontend
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener el feed de mascotas:", error);
        res.status(500).json({ error: 'Error al cargar las mascotas.' });
    }
};

export const getMyReports = async (req, res) => {
    try {
        const user_id = req.user.id;
        const result = await pool.query(
            // Cambiamos created_at por id
            'SELECT * FROM pets WHERE user_id = $1 ORDER BY id DESC',
            [user_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener mis reportes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
