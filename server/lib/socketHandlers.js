// Handlers de socket.io extraídos para poder testearlos aparte.
// Cada handler recibe sus dependencias por parámetro para poder mockearlas
// (pool de Postgres, instancia de socket.io, sendExpoPush, y el socket del
// cliente que disparó el evento).

export async function handleSendPetMessage({ pool, io, sendExpoPush, socket, data }) {
    const { pet_id, receiver_id, content, petPhoto, senderName } = data || {};
    const sender_id = socket.userId; // Seguridad: usamos el ID del token, no el del payload

    if (!pet_id || !receiver_id || !content || !String(content).trim()) {
        socket.emit('error_notification', 'Faltan datos para enviar el mensaje');
        return { ok: false, reason: 'missing_data' };
    }

    try {
        // A. Guardar en DB.
        const result = await pool.query(
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

        // D. Notificación global para refrescar el inbox.
        io.to(`user_${receiver_id}`).emit('new_notification', {
            pet_id,
            petPhoto,
            sender_id,
            senderName,
            content,
        });

        // E. Push notification al receptor. Fire-and-forget para no bloquear.
        pool.query('SELECT push_token FROM users WHERE id = $1', [receiver_id])
            .then(({ rows }) => {
                const pushToken = rows[0]?.push_token;
                if (!pushToken) return;
                sendExpoPush(pushToken, {
                    title: senderName || 'Mensaje nuevo',
                    body: content.length > 120 ? content.slice(0, 117) + '…' : content,
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
    const { pet_id } = data || {};
    if (!pet_id) return { ok: false, reason: 'missing_pet_id' };
    socket.join(`pet_chat_${pet_id}`);
    return { ok: true };
}
