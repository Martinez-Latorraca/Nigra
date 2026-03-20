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
        const userId = req.user.id; // El ID viene del token (middleware)

        const query = `
            SELECT 
                m.id, 
                m.content, 
                m.created_at, 
                p.photo_url, 
                p.description as pet_name,
                u.name as sender_name
            FROM messages m
            JOIN pets p ON m.pet_id = p.id
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.receiver_id = $1
            ORDER BY m.created_at DESC;
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);

    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getPetMessages = async (req, res) => {
    try {
        const { petId } = req.params;
        const result = await pool.query(
            'SELECT * FROM messages WHERE pet_id = $1 ORDER BY created_at ASC',
            [petId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al traer mensajes" });
    }
};