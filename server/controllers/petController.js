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

export const reportPet = async (req, res) => {
    try {
        // 1. Agregamos lat y lng a la extracción de datos
        const { description, status, contact_info, type, color, lat, lng } = req.body;

        // Verificamos que venga el archivo antes de intentar leer su buffer
        if (!req.file || !req.file.buffer) {
            return res.status(400).send('Falta la imagen');
        }

        const imageBuffer = req.file.buffer;
        const userId = req.user.id;

        const vector = await generateEmbedding(imageBuffer);
        const vectorString = JSON.stringify(vector);

        const cloudinaryResult = await uploadToCloudinary(imageBuffer);
        const photoUrl = cloudinaryResult.secure_url;

        // 2. Agregamos lat y lng al INSERT y a los VALUES ($9, $10)
        const query = `
          INSERT INTO pets (description, status, contact_info, photo_url, embedding, type, color, user_id, lat, lng)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, description, photo_url;
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
            userId,
            lat ? parseFloat(lat) : null,
            lng ? parseFloat(lng) : null
        ]);

        res.json({ success: true, pet: result.rows[0] });

    } catch (error) {
        console.error('Error procesando el reporte:', error);
        res.status(500).json({ error: 'Error procesando la solicitud' });
    }
};

export const searchPet = async (req, res) => {
    try {
        // 1. Extraemos las coordenadas además de los filtros
        const { type, color, lat, lng } = req.body;
        console.log(req.body);

        if (!req.file || !req.file.buffer) {
            return res.status(400).send('Falta la imagen');
        }

        const imageBuffer = req.file.buffer;

        // Generamos el vector de la foto que subió el usuario
        const vector = await generateEmbedding(imageBuffer);
        const vectorString = JSON.stringify(vector);

        let query = '';
        let params = [];

        // 2. LA MAGIA MATEMÁTICA: Si el usuario mandó coordenadas, filtramos por distancia
        if (lat && lng) {
            const radioKm = 10; // Buscar mascotas en un radio de 10 kilómetros

            query = `
                SELECT id, description, photo_url, status, contact_info, type, color, lat, lng,
                -- Esta es la fórmula de Haversine para calcular los KM exactos de distancia:
                (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) AS distance_km
                FROM pets
                WHERE type = $3 
                AND color = $4
                AND lat IS NOT NULL 
                AND lng IS NOT NULL
                -- Filtramos para que solo traiga los que están a menos del radio establecido:
                AND (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) <= $5
                -- Finalmente, ordenamos primero por la IA (qué tan parecidos son)
                ORDER BY embedding <-> $6
                LIMIT 10;
            `;
            params = [
                parseFloat(lat),
                parseFloat(lng),
                type,
                color,
                radioKm,
                vectorString
            ];
        } else {
            // 3. Si NO mandó mapa, hacemos la búsqueda normal en toda la base de datos
            query = `
                SELECT id, description, photo_url, status, contact_info, type, color
                FROM pets
                WHERE type = $1 AND color = $2
                ORDER BY embedding <-> $3
                LIMIT 10;
            `;
            params = [type, color, vectorString];
        }

        const result = await pool.query(query, params);

        // Devolvemos las mascotas encontradas
        res.json(result.rows);

    } catch (error) {
        console.error('Error buscando mascotas:', error);
        res.status(500).json({ error: 'Error procesando la búsqueda' });
    }
};

export const getMyReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            // Cambiamos created_at por id
            'SELECT * FROM pets WHERE user_id = $1 ORDER BY id DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener mis reportes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Función para eliminar un reporte
export const deleteReport = async (req, res) => {
    try {
        const petId = req.params.id;
        const userId = req.user.id;

        const result = await pool.query(
            'DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING *',
            [petId, userId]
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