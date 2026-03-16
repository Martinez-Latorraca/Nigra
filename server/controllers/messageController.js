// Función para enviar un mensaje a otro usuario
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