// Función para enviar un mensaje a otro usuario
import pool from '../db.js';



export const sendMessage = async (req, res) => {

    try {
        const { receiver_id, pet_id, content } = req.body;
        const sender_id = req.user.id; // El ID de quien está logueado y buscando

        // Validamos que no se esté mandando un mensaje a sí mismo (opcional pero recomendado)
        if (sender_id === parseInt(receiver_id)) {
            return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo' });
        }

        const query = `
            INSERT INTO messages (sender_id, receiver_id, pet_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const result = await pool.query(query, [sender_id, receiver_id, pet_id, content]);
        res.json({ success: true, message: 'Mensaje enviado correctamente', data: result.rows[0] });

    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ error: 'Error procesando el envío del mensaje' });
    }
};

export const getMyMessages = async (req, res) => {
    try {
        const user_id = req.user.id; // El ID viene del token (middleware)

        const query = `
            SELECT DISTINCT ON (
                m.pet_id, 
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
            )
                m.pet_id,
                m.content,
                m.sender_id,
                m.receiver_id,
                m.is_read,
                m.created_at,
                p.photo_url,
                p.description,
                p.user_id as reporter_id,
                u_sender.name AS sender_name,
                u_receiver.name AS receiver_name,
                -- 🔥 Helpers para el frontend: identifican al "otro" automáticamente
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
                CASE WHEN m.sender_id = $1 THEN u_receiver.name ELSE u_sender.name END AS other_user_name
            FROM messages m
            JOIN pets p ON m.pet_id = p.id
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY 
                m.pet_id, 
                CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END, 
                m.created_at DESC;
        `;

        const result = await pool.query(query, [user_id]);

        // 💡 Detalle importante: Como Postgres nos obliga a ordenar primero por pet_id 
        // para usar DISTINCT ON, la lista final nos queda agrupada por mascotas.
        // Lo reordenamos en JavaScript para que el chat más reciente de todos quede arriba del inbox.
        const sortedChats = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(sortedChats);

    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


export const getChatHistory = async (req, res) => {
    const pet_id = req.params.pet_id;
    const otherUserId = req.params.otherUserId;
    const myId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;

    try {
        const countQuery = `
            SELECT COUNT(*) FROM messages
            WHERE pet_id = $1
            AND (
                (sender_id = $2 AND receiver_id = $3)
                OR
                (sender_id = $3 AND receiver_id = $2)
            )
        `;
        const countResult = await pool.query(countQuery, [pet_id, myId, otherUserId]);
        const total = parseInt(countResult.rows[0].count);

        const query = `
            SELECT
                id,
                content,
                sender_id AS "sender_id",
                receiver_id AS "receiver_id",
                pet_id AS "pet_id",
                created_at
            FROM messages
            WHERE pet_id = $1
            AND (
                (sender_id = $2 AND receiver_id = $3)
                OR
                (sender_id = $3 AND receiver_id = $2)
            )
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5;
        `;
        const result = await pool.query(query, [pet_id, myId, otherUserId, limit, offset]);

        res.json({
            messages: result.rows.reverse(),
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el historial' });
    }
};


export const readPetMessages = async (req, res) => {
    try {
        const my_id = req.user.id; // Del token
        const { pet_id, other_user_id } = req.body;

        const query = `
            UPDATE messages 
            SET is_read = true 
            WHERE pet_id = $1 
              AND sender_id = $2 
              AND receiver_id = $3 
              AND is_read = false
        `;

        // El sender_id es el "otro" (porque él lo envió) y receiver_id sos vos.
        await pool.query(query, [pet_id, other_user_id, my_id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar leído:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
};