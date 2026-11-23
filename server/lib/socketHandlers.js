// Handlers de socket.io extraídos para poder testearlos aparte.
// Cada handler recibe sus dependencias por parámetro para poder mockearlas
// (pool de Postgres, instancia de socket.io, sendExpoPush, y el socket del
// cliente que disparó el evento).

const MAX_CONTENT_LENGTH = 1000;

// Las fotos del chat se suben antes por HTTP (POST /api/messages/image) y el
// mensaje solo lleva la URL. Aceptamos únicamente URLs de nuestra cuenta de
// Cloudinary en la carpeta del chat, para que no se puedan colar links
// arbitrarios (tracking, phishing) disfrazados de foto.
function isChatImageUrl(url) {
    if (typeof url !== 'string' || url.length > 500) return false;
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloud) return false;
    return url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`) && url.includes('/mimo/chat/');
}

// Devuelve { ok: true, pet_id, receiver_id, content, image_url? } o { ok: false, reason }.
// Chequea tipos, longitud del content, y bloquea self-DM. Un mensaje con
// foto puede venir sin texto.
function validateMessagePayload(data, senderId) {
    const petIdRaw = data?.pet_id;
    const receiverIdRaw = data?.receiver_id;
    const contentRaw = data?.content;

    const pet_id = Number(petIdRaw);
    const receiver_id = Number(receiverIdRaw);
    if (!Number.isInteger(pet_id) || pet_id <= 0) return { ok: false, reason: 'invalid_pet_id' };
    if (!Number.isInteger(receiver_id) || receiver_id <= 0) return { ok: false, reason: 'invalid_receiver_id' };
    if (receiver_id === Number(senderId)) return { ok: false, reason: 'self_message' };

    const imageRaw = data?.image_url;
    if (imageRaw != null && !isChatImageUrl(imageRaw)) return { ok: false, reason: 'invalid_image' };
    const image_url = imageRaw || null;

    // Sin foto, el texto es obligatorio; con foto puede faltar.
    if (typeof contentRaw !== 'string' && !(contentRaw == null && image_url)) return { ok: false, reason: 'invalid_content' };
    const content = (contentRaw || '').trim();
    if (!content && !image_url) return { ok: false, reason: 'empty_content' };
    if (content.length > MAX_CONTENT_LENGTH) return { ok: false, reason: 'content_too_long' };

    return { ok: true, pet_id, receiver_id, content, ...(image_url ? { image_url } : {}) };
}

// Regla del feature: en un chat sobre una mascota, sender o receiver debe ser
// el dueño del reporte. Sin eso, un user autenticado podría DMar a cualquier
// otro user sobre cualquier pet, spam + phishing. También bloqueamos el envío
// si el caso ya está resuelto — el owner recuperó a su mascota y no necesita
// seguir recibiendo mensajes. Se puede reabrir el reporte si fue por error.
async function verifyChatRelationship(pool, { pet_id, sender_id, receiver_id }) {
    const { rows } = await pool.query(
        'SELECT user_id, resolved_at FROM pets WHERE id = $1',
        [pet_id]
    );
    if (rows.length === 0) return { ok: false, reason: 'pet_not_found' };
    const ownerId = Number(rows[0].user_id);
    if (ownerId !== Number(sender_id) && ownerId !== Number(receiver_id)) {
        return { ok: false, reason: 'not_related_to_pet' };
    }
    if (rows[0].resolved_at) {
        return { ok: false, reason: 'case_closed' };
    }
    return { ok: true };
}

// Trust & safety: si hay un bloqueo entre sender y receiver en CUALQUIER
// dirección, no se entrega el mensaje. El bloqueo es simétrico en el delivery.
async function isBlockedPair(pool, a, b) {
    const { rows } = await pool.query(
        `SELECT 1 FROM user_blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)
         LIMIT 1`,
        [a, b]
    );
    return rows.length > 0;
}

// Buscamos senderName en la DB en vez de confiar en lo que mande el cliente
// (payload spoofable → push notification con títulos maliciosos).
async function loadSenderProfile(pool, senderId) {
    const { rows } = await pool.query("SELECT split_part(btrim(name), ' ', 1) AS name FROM users WHERE id = $1", [senderId]);
    return rows[0] || null;
}

// Cuando el pet fue publicado por una vet Y el sender es el owner de esa
// vet, el nombre que ve el receiver del mensaje es el de la vet, no el
// del user personal. Le da coherencia al chat: el user contactó a la vet
// desde el pet, entonces cuando le responden, ve "Veterinaria X" no "Juan".
async function resolveSenderDisplayName(pool, { senderId, petId, fallback }) {
    const { rows } = await pool.query(
        `SELECT v.name
         FROM pets p
         JOIN vets v ON v.id = p.registered_by_vet_id
         WHERE p.id = $1 AND v.owner_user_id = $2 AND v.approved = TRUE`,
        [petId, senderId]
    );
    return rows[0]?.name || fallback;
}

export async function handleSendPetMessage({ pool, io, sendExpoPush, socket, data }) {
    const sender_id = socket.userId; // Seguridad: usamos el ID del token, no el del payload

    const validated = validateMessagePayload(data, sender_id);
    if (!validated.ok) {
        socket.emit('error_notification', 'Datos del mensaje inválidos');
        return { ok: false, reason: validated.reason };
    }
    const { pet_id, receiver_id, content, image_url } = validated;
    // Texto para notificaciones cuando el mensaje es solo una foto.
    const preview = content || 'Te mandó una foto';
    const petPhoto = typeof data?.petPhoto === 'string' ? data.petPhoto : null;

    const relation = await verifyChatRelationship(pool, { pet_id, sender_id, receiver_id });
    if (!relation.ok) {
        const msg = relation.reason === 'case_closed'
            ? 'El caso está cerrado — no se pueden enviar más mensajes'
            : 'No podés enviar mensajes sobre esta mascota';
        socket.emit('error_notification', msg);
        return { ok: false, reason: relation.reason };
    }

    // Bloqueo entre las partes → no se entrega.
    if (await isBlockedPair(pool, sender_id, receiver_id)) {
        socket.emit('error_notification', 'No se puede enviar el mensaje a esta persona');
        return { ok: false, reason: 'blocked' };
    }

    const senderProfile = await loadSenderProfile(pool, sender_id);
    const senderName = await resolveSenderDisplayName(pool, {
        senderId: sender_id,
        petId: pet_id,
        fallback: senderProfile?.name || 'Alguien',
    });

    try {
        // A. Guardar en DB. Solo tocamos image_url cuando hay foto.
        const result = image_url
            ? await pool.query(
                `INSERT INTO messages (pet_id, sender_id, receiver_id, content, image_url, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING *`,
                [pet_id, sender_id, receiver_id, content, image_url]
            )
            : await pool.query(
                `INSERT INTO messages (pet_id, sender_id, receiver_id, content, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
                [pet_id, sender_id, receiver_id, content]
            );
        const newMessage = result.rows[0];

        // B. Enviar al destinatario en tiempo real.
        io.to(`user_${receiver_id}`).emit('receive_pet_message', newMessage);
        // C. Enviar también al emisor (para pestañas duplicadas).
        socket.emit('receive_pet_message', newMessage);

        // D. Notificación global para refrescar el inbox. senderName y petPhoto
        // salen de la DB / del payload respectivamente pero después de la
        // relación validada — no se pueden usar para spoofar identidad.
        io.to(`user_${receiver_id}`).emit('new_notification', {
            pet_id,
            petPhoto,
            sender_id,
            senderName,
            content: preview,
        });

        // E. Push notification al receptor. Fire-and-forget para no bloquear.
        pool.query('SELECT push_token FROM users WHERE id = $1', [receiver_id])
            .then(({ rows }) => {
                const pushToken = rows[0]?.push_token;
                if (!pushToken) return;
                sendExpoPush(pushToken, {
                    title: senderName,
                    body: preview.length > 120 ? preview.slice(0, 117) + '…' : preview,
                    data: {
                        type: 'message',
                        pet_id,
                        otherUserId: sender_id,
                        receiver_id,
                        name: senderName,
                        photo: petPhoto,
                    },
                });
            })
            .catch((e) => console.error('push lookup error:', e.message));

        return { ok: true, message: newMessage };
    } catch (error) {
        console.error('❌ Error en send_pet_message:', error);
        socket.emit('error_notification', 'No se pudo enviar el mensaje');
        return { ok: false, reason: 'db_error' };
    }
}

export function handleJoinPetChat({ socket, data }) {
    const pet_id = Number(data?.pet_id);
    if (!Number.isInteger(pet_id) || pet_id <= 0) return { ok: false, reason: 'invalid_pet_id' };
    socket.join(`pet_chat_${pet_id}`);
    return { ok: true };
}

// Exportados para tests unitarios directos.
export { validateMessagePayload, verifyChatRelationship, isBlockedPair, isChatImageUrl, MAX_CONTENT_LENGTH };
