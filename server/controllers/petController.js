import pool from '../db.js';
import { generateEmbedding, generateEmbeddings } from '../ai.js';
import { v2 as cloudinary } from 'cloudinary';
import { reverseGeocode } from '../utils/geocode.js';
import { sendExpoPush } from '../utils/push.js';

// Busca matches del nuevo reporte en el pool opuesto y avisa por push a los
// dueños de las candidatas. Async + fire-and-forget desde reportPet: no
// bloqueamos la respuesta al reportero. Usa el embedding ya generado (sin TTA)
// para no sumar inferencias al flujo de reporte.
async function notifyMatchesForReport({ newPet, vector, type, color, status, lat, lng, reporterId }) {
    if (lat == null || lng == null) return;
    try {
        const oppositeStatus = status === 'lost' ? 'found' : 'lost';
        const radioKm = 50;
        const sql = `
            SELECT p.id, p.name, p.description,
                (p.embedding <=> $7) AS visual_distance,
                u.push_token
            FROM pets p
            JOIN users u ON p.user_id = u.id
            WHERE p.type = $3
              AND p.color = $4
              AND p.status = $6
              AND p.user_id <> $8
              AND p.lat IS NOT NULL
              AND p.lng IS NOT NULL
              AND (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) <= $5
            ORDER BY visual_distance
            LIMIT 5
        `;
        const params = [lat, lng, type, color, radioKm, oppositeStatus, JSON.stringify(vector), reporterId];
        const { rows } = await pool.query(sql, params);
        const matches = rows.filter((r) => r.visual_distance <= 0.25);
        for (const m of matches) {
            if (!m.push_token) continue;
            sendExpoPush(m.push_token, {
                title: 'Posible coincidencia en Nigra',
                body: `Reportaron una mascota similar a la tuya${m.name ? ` (${m.name})` : ''}. ¿Es la tuya?`,
                data: { type: 'match', pet_id: newPet.id },
            });
        }
        if (matches.length > 0) {
            console.log(`🔔 ${matches.length} match push(es) enviados para pet ${newPet.id}`);
        }
    } catch (error) {
        console.error('notifyMatchesForReport error:', error.message);
    }
}

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

        const pet = result.rows[0];

        // Lazy reverse-geocode: older pets created before the address column
        // get their address resolved (and saved) the first time they're opened.
        if (!pet.address && pet.lat != null && pet.lng != null) {
            const address = await reverseGeocode(pet.lat, pet.lng);
            if (address) {
                await pool.query('UPDATE pets SET address = $1 WHERE id = $2', [address, pet.id]);
                pet.address = address;
            }
        }

        res.json(pet);
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

        const latNum = lat ? parseFloat(lat) : null;
        const lngNum = lng ? parseFloat(lng) : null;
        const address = await reverseGeocode(latNum, lngNum);

        const query = `
          INSERT INTO pets (
            description, status, contact_info, photo_url,
            embedding, type, color, user_id, lat, lng, name, extra_photos, address
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id, description, status, photo_url, name, extra_photos, created_at, address;
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
            latNum,
            lngNum,
            name,
            extraPhotosJson,
            address

        ]);

        res.json({ success: true, pet: result.rows[0] });

        // Fire-and-forget: notificamos por push a los dueños de mascotas
        // del pool opuesto cuya foto coincide visualmente.
        notifyMatchesForReport({
            newPet: result.rows[0],
            vector,
            type,
            color,
            status,
            lat: latNum,
            lng: lngNum,
            reporterId: user_id,
        });

    } catch (error) {
        console.error('Error procesando el reporte:', error);
        res.status(500).json({ error: 'Error procesando la solicitud' });
    }
};

export const searchPet = async (req, res) => {
    try {
        const { type, color, lat, lng, searchRatio, status } = req.body;

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'Falta la imagen' });
        }

        const imageBuffer = req.file.buffer;
        // TTA: el worker devuelve varios embeddings (original + flip + brillo).
        // En SQL tomamos LEAST(distancia a cada variante) por mascota, así una
        // foto de baja calidad tiene varias chances de matchear contra el embedding
        // guardado, sin tener que aflojar el umbral global.
        const vectors = await generateEmbeddings(imageBuffer);
        const vectorStrings = vectors.map((v) => JSON.stringify(v));

        let query = '';
        let params = [];

        if (lat && lng) {
            const radioKm = parseFloat(searchRatio) || 10;
            query = `
                SELECT p.id, p.description, p.photo_url, p.status, p.contact_info, p.type, p.color, p.lat, p.lng, p.name,
                u.name AS reporter_name, u.id AS reporter_id,
                (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) AS distance_km,
                LEAST(p.embedding <=> $7, p.embedding <=> $8, p.embedding <=> $9) AS visual_distance
                FROM pets p
                JOIN users u ON p.user_id = u.id
                WHERE p.type = $3
                AND p.color = $4
                AND p.status = $6
                AND p.lat IS NOT NULL
                AND p.lng IS NOT NULL
                AND (6371 * acos(cos(radians($1)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($2)) + sin(radians($1)) * sin(radians(p.lat)))) <= $5
                ORDER BY visual_distance
                LIMIT 10;
            `;
            params = [parseFloat(lat), parseFloat(lng), type, color, radioKm, status, ...vectorStrings];
        } else {
            query = `
                SELECT p.id, p.description, p.photo_url, p.status, p.contact_info, p.type, p.color, p.name,
                u.name AS reporter_name, u.id AS reporter_id,
                LEAST(p.embedding <=> $4, p.embedding <=> $5, p.embedding <=> $6) AS visual_distance
                FROM pets p
                JOIN users u ON p.user_id = u.id
                WHERE p.type = $1
                AND p.color = $2
                AND p.status = $3
                ORDER BY visual_distance
                LIMIT 10;
            `;
            params = [type, color, status, ...vectorStrings];
        }

        const result = await pool.query(query, params);


        const SIMILARITY_THRESHOLD = 0.25;

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
                   lat, lng, extra_photos, name, created_at, address
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
