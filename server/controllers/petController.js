import pool from '../db.js';
import { generateEmbedding, generateEmbeddings } from '../ai.js';
import { v2 as cloudinary } from 'cloudinary';
import { reverseGeocode } from '../utils/geocode.js';
import { sendExpoPush } from '../utils/push.js';

const NEARBY_ALERT_RADIUS_KM = 5;

// Alerta a users que optaron in (notify_nearby=true) y compartieron ubicación
// en los últimos 30 días, cuyas coordenadas caen dentro de un radio del reporte.
// Filtra al reporter y a users sin push_token. Anti-dupe vía notifications:
// si ya existe una notif tipo nearby_* del mismo pet para el user, skip.
// Fire-and-forget desde reportPet.
export async function notifyNearbyUsers({ pool, io, sendExpoPush, newPet, reporterId }) {
    if (newPet.lat == null || newPet.lng == null) return;
    if (!['lost', 'found'].includes(newPet.status)) return;
    try {
        const notifType = newPet.status === 'lost' ? 'nearby_lost' : 'nearby_found';
        // El WHERE NO filtra por push_token: users sin token igual reciben la
        // notification en su inbox (útil para users web-only). Sólo el push
        // real se gate más abajo por presencia de push_token.
        const sql = `
            SELECT u.id, u.name, u.push_token
            FROM users u
            WHERE u.notify_nearby = true
              AND u.last_lat IS NOT NULL
              AND u.last_lng IS NOT NULL
              AND u.last_location_at > NOW() - INTERVAL '30 days'
              AND u.id <> $3
              AND (6371 * acos(cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat)))) <= $4
            LIMIT 100
        `;
        const { rows: candidates } = await pool.query(sql, [
            newPet.lat, newPet.lng, reporterId, NEARBY_ALERT_RADIUS_KM,
        ]);
        for (const u of candidates) {
            // Dedupe: si ya le mandamos alerta de este pet, skip.
            const exists = await pool.query(
                `SELECT 1 FROM notifications
                 WHERE user_id = $1 AND type = $2 AND (data->>'pet_id')::int = $3`,
                [u.id, notifType, newPet.id]
            );
            if (exists.rows.length > 0) continue;

            const notifData = {
                pet_id: newPet.id,
                pet_status: newPet.status,
                pet_type: newPet.type,
                photo_url: newPet.photo_url,
                name: newPet.name,
                address: newPet.address,
            };
            let inserted = null;
            try {
                const ins = await pool.query(
                    `INSERT INTO notifications (user_id, type, data)
                     VALUES ($1, $2, $3::jsonb)
                     RETURNING id, user_id, type, data, read_at, created_at`,
                    [u.id, notifType, JSON.stringify(notifData)]
                );
                inserted = ins.rows[0];
            } catch (e) {
                console.error('nearby notification insert error:', e.message);
                continue;
            }
            if (io && inserted) {
                io.to(`user_${u.id}`).emit('new_match_notification', inserted);
            }
            const petLabel = newPet.name ? ` (${newPet.name})` : '';
            const areaSuffix = newPet.address ? ` en ${newPet.address}` : ' cerca tuyo';
            const title = newPet.status === 'lost'
                ? '🐾 Mascota perdida cerca tuyo'
                : '🐾 Encontraron una mascota cerca tuyo';
            const body = newPet.status === 'lost'
                ? `Reportaron${petLabel} perdido/a${areaSuffix}. Tap para ver.`
                : `Alguien encontró un/a mascota${petLabel}${areaSuffix}. ¿La conocés?`;
            if (u.push_token) {
                try {
                    sendExpoPush(u.push_token, {
                        title,
                        body,
                        data: {
                            type: notifType,
                            pet_id: newPet.id,
                            receiver_id: u.id,
                        },
                    });
                } catch (e) {
                    console.error('nearby push error:', e?.message);
                }
            }
        }
        if (candidates.length > 0) {
            console.log(`🔔 nearby alerts: ${candidates.length} user(s) notificados para pet ${newPet.id}`);
        }
    } catch (error) {
        console.error('notifyNearbyUsers error:', error.message);
    }
}

// Alerta a vets aprobadas cercanas al reporte cuando el pet cae dentro del
// alert_radius_km propio de cada vet y coincide con su opt-in de tipo
// (receives_lost / receives_found). El push va al owner_user_id de la vet.
// Filtra al reporter (por si el reporte lo hizo el propio owner de la vet)
// y dedupe por notification para no spammear.
export async function notifyNearbyVets({ pool, io, sendExpoPush, newPet, reporterId }) {
    if (newPet.lat == null || newPet.lng == null) return;
    if (!['lost', 'found'].includes(newPet.status)) return;
    try {
        const notifType = newPet.status === 'lost' ? 'nearby_vet_lost' : 'nearby_vet_found';
        const optInField = newPet.status === 'lost' ? 'v.receives_lost' : 'v.receives_found';
        const sql = `
            SELECT v.id AS vet_id, v.name AS vet_name, v.slug AS vet_slug,
                   v.owner_user_id, u.push_token
            FROM vets v
            JOIN users u ON u.id = v.owner_user_id
            WHERE v.approved = TRUE
              AND ${optInField} = TRUE
              AND v.lat IS NOT NULL
              AND v.lng IS NOT NULL
              AND v.owner_user_id <> $3
              AND (6371 * acos(cos(radians($1)) * cos(radians(v.lat)) * cos(radians(v.lng) - radians($2)) + sin(radians($1)) * sin(radians(v.lat)))) <= v.alert_radius_km
            LIMIT 100
        `;
        const { rows: candidates } = await pool.query(sql, [
            newPet.lat, newPet.lng, reporterId,
        ]);
        for (const vet of candidates) {
            // Dedupe: si la vet ya fue notificada de este pet, skip.
            const exists = await pool.query(
                `SELECT 1 FROM notifications
                 WHERE user_id = $1 AND type = $2 AND (data->>'pet_id')::int = $3`,
                [vet.owner_user_id, notifType, newPet.id]
            );
            if (exists.rows.length > 0) continue;

            const notifData = {
                pet_id: newPet.id,
                pet_status: newPet.status,
                pet_type: newPet.type,
                photo_url: newPet.photo_url,
                name: newPet.name,
                address: newPet.address,
                vet_id: vet.vet_id,
                vet_slug: vet.vet_slug,
            };
            let inserted = null;
            try {
                const ins = await pool.query(
                    `INSERT INTO notifications (user_id, type, data)
                     VALUES ($1, $2, $3::jsonb)
                     RETURNING id, user_id, type, data, read_at, created_at`,
                    [vet.owner_user_id, notifType, JSON.stringify(notifData)]
                );
                inserted = ins.rows[0];
            } catch (e) {
                console.error('nearby vet notification insert error:', e.message);
                continue;
            }
            if (io && inserted) {
                io.to(`user_${vet.owner_user_id}`).emit('new_match_notification', inserted);
            }
            const petLabel = newPet.name ? ` (${newPet.name})` : '';
            const areaSuffix = newPet.address ? ` en ${newPet.address}` : ' en tu zona';
            const title = newPet.status === 'lost'
                ? '🐾 Mascota perdida cerca de la vet'
                : '🐾 Encontraron una mascota cerca de la vet';
            const body = newPet.status === 'lost'
                ? `Reportaron${petLabel} perdido/a${areaSuffix}. Puede aparecer por el local.`
                : `Alguien encontró un/a mascota${petLabel}${areaSuffix}. Podría ser cliente tuyo.`;
            if (vet.push_token) {
                try {
                    sendExpoPush(vet.push_token, {
                        title,
                        body,
                        data: {
                            type: notifType,
                            pet_id: newPet.id,
                            receiver_id: vet.owner_user_id,
                            vet_id: vet.vet_id,
                        },
                    });
                } catch (e) {
                    console.error('nearby vet push error:', e?.message);
                }
            }
        }
        if (candidates.length > 0) {
            console.log(`🏥 nearby vet alerts: ${candidates.length} vet(s) notificadas para pet ${newPet.id}`);
        }
    } catch (error) {
        console.error('notifyNearbyVets error:', error.message);
    }
}

// Busca matches del nuevo reporte en el pool opuesto y avisa por push a los
// dueños de las candidatas. Async + fire-and-forget desde reportPet: no
// bloqueamos la respuesta al reportero. Usa el embedding ya generado (sin TTA)
// para no sumar inferencias al flujo de reporte.
async function notifyMatchesForReport({ newPet, vector, type, color, status, lat, lng, reporterId, io }) {
    if (lat == null || lng == null) return;
    try {
        const oppositeStatus = status === 'lost' ? 'found' : 'lost';
        const radioKm = 50;
        const sql = `
            SELECT p.id, p.user_id, p.name, p.description,
                (p.embedding <=> $7) AS visual_distance,
                u.push_token
            FROM pets p
            JOIN users u ON p.user_id = u.id
            WHERE p.type = $3
              AND p.color = $4
              AND p.status = $6
              AND p.resolved_at IS NULL
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
            const notifData = {
                pet_id: newPet.id,
                photo_url: newPet.photo_url,
                status: newPet.status,
                name: newPet.name,
                description: newPet.description,
                match_name: m.name,
            };
            // 1) Persistimos la notificación para que aparezca en el inbox.
            let inserted = null;
            try {
                const ins = await pool.query(
                    `INSERT INTO notifications (user_id, type, data) VALUES ($1, 'match', $2::jsonb)
                     RETURNING id, user_id, type, data, read_at, created_at`,
                    [m.user_id, JSON.stringify(notifData)]
                );
                inserted = ins.rows[0];
            } catch (e) {
                console.error('No se pudo persistir match notification:', e.message);
            }
            // 2) Avisamos en tiempo real al receptor (si está conectado).
            if (io && inserted) {
                io.to(`user_${m.user_id}`).emit('new_match_notification', inserted);
            }
            // 3) Push del sistema (lo de antes).
            if (m.push_token) {
                sendExpoPush(m.push_token, {
                    title: 'Posible coincidencia en Mimo',
                    body: `Reportaron una mascota similar a la tuya${m.name ? ` (${m.name})` : ''}. ¿Es la tuya?`,
                    data: {
                        type: 'match',
                        pet_id: newPet.id,
                        receiver_id: m.user_id, // para que el cliente valide
                    },
                });
            }
        }
        if (matches.length > 0) {
            console.log(`🔔 ${matches.length} match notification(s) generadas para pet ${newPet.id}`);
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
        // No devolvemos p.embedding (vector 1280 floats): ~30KB por respuesta
        // sin uso en el cliente. Lista explícita en lugar de p.*.
        const query = `
            SELECT
                p.id, p.description, p.status, p.contact_info, p.photo_url,
                p.type, p.color, p.user_id, p.lat, p.lng, p.name, p.extra_photos,
                p.address, p.resolved_at, p.resolved_with_user_id, p.created_at,
                u.name AS reporter_name
            FROM pets p
            JOIN users u ON p.user_id = u.id
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

        // Fire-and-forget: notificamos por push + inbox a los dueños de mascotas
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
            io: req.app.locals.io,
        });

        // Fire-and-forget: alertas geográficas a users que optaron in y están cerca.
        notifyNearbyUsers({
            pool,
            io: req.app.locals.io,
            sendExpoPush,
            newPet: { ...result.rows[0], lat: latNum, lng: lngNum, type, status },
            reporterId: user_id,
        });

        // Fire-and-forget: alertas a vets aprobadas con opt-in y radio propio.
        notifyNearbyVets({
            pool,
            io: req.app.locals.io,
            sendExpoPush,
            newPet: { ...result.rows[0], lat: latNum, lng: lngNum, type, status },
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
                AND p.resolved_at IS NULL
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
                AND p.resolved_at IS NULL
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

// Marca la mascota como reunida (resolved_at = NOW) o la reabre (NULL).
// Solo el dueño del reporte puede cambiar el estado. Si el request incluye
// resolved_with_user_id, se guarda quién fue el finder del reencuentro —
// esto habilita mostrar el banner de donación en ese chat y un aviso de
// "caso cerrado" en los otros chats de la misma mascota.
export const resolvePet = async (req, res) => {
    try {
        const userId = req.user.id;
        const petId = req.params.id;
        const { resolved, resolved_with_user_id } = req.body;
        if (typeof resolved !== 'boolean') {
            return res.status(400).json({ error: 'Falta el campo resolved (boolean)' });
        }
        const ownerCheck = await pool.query('SELECT user_id, name FROM pets WHERE id = $1', [petId]);
        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }
        if (Number(ownerCheck.rows[0].user_id) !== Number(userId)) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        const resolvedAt = resolved ? new Date() : null;
        // Solo aceptamos resolved_with_user_id cuando estamos cerrando (no al reabrir).
        const resolvedWith = resolved && resolved_with_user_id != null
            ? Number(resolved_with_user_id)
            : null;
        await pool.query(
            'UPDATE pets SET resolved_at = $1, resolved_with_user_id = $2 WHERE id = $3',
            [resolvedAt, resolvedWith, petId]
        );

        // Al cerrar el caso, marcamos como leídos TODOS los mensajes pendientes
        // sobre esta mascota (para todos los chats abiertos, incluidos los que
        // el dueño no cerró). El caso terminó → no hay acción pendiente en el
        // inbox. Sin esto, la campanita con "N sin leer" quedaba encendida
        // para siempre después de cerrar.
        if (resolved) {
            await pool.query(
                'UPDATE messages SET is_read = true WHERE pet_id = $1 AND is_read = false',
                [petId]
            );
        }

        // Aviso en tiempo real a ambas partes del reencuentro.
        const io = req.app.locals.io;
        if (io && resolved) {
            const payload = {
                pet_id: Number(petId),
                pet_name: ownerCheck.rows[0].name,
                resolved_at: resolvedAt,
                resolved_with_user_id: resolvedWith,
                owner_id: userId,
            };
            io.to(`user_${userId}`).emit('pet_resolved', payload);
            if (resolvedWith) {
                io.to(`user_${resolvedWith}`).emit('pet_resolved', payload);
            }
        } else if (io && !resolved) {
            // Reabrir → avisamos también para que el frontend saque el banner.
            io.to(`user_${userId}`).emit('pet_reopened', { pet_id: Number(petId) });
        }

        res.json({
            success: true,
            resolved_at: resolvedAt,
            resolved_with_user_id: resolvedWith,
        });
    } catch (error) {
        console.error('Error en resolvePet:', error);
        res.status(500).json({ error: 'Error procesando la solicitud' });
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

        const conditions = ['resolved_at IS NULL'];
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
