import pool from '../db.js';

// ─── DASHBOARD STATS ────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    try {
        const [usersCount, petsCount, messagesCount, petsLost, petsFound] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM pets'),
            pool.query('SELECT COUNT(*) FROM messages'),
            pool.query("SELECT COUNT(*) FROM pets WHERE status = 'lost'"),
            pool.query("SELECT COUNT(*) FROM pets WHERE status = 'found'"),
        ]);

        const recentPets = await pool.query(
            `SELECT p.id, p.name, p.status, p.type, p.color, p.photo_url, p.created_at,
                    u.name AS reporter_name, u.email AS reporter_email
             FROM pets p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC LIMIT 5`
        );

        const recentUsers = await pool.query(
            `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`
        );

        res.json({
            totalUsers: parseInt(usersCount.rows[0].count),
            totalPets: parseInt(petsCount.rows[0].count),
            totalMessages: parseInt(messagesCount.rows[0].count),
            totalLost: parseInt(petsLost.rows[0].count),
            totalFound: parseInt(petsFound.rows[0].count),
            recentPets: recentPets.rows,
            recentUsers: recentUsers.rows,
        });
    } catch (error) {
        console.error('Error en dashboard stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
};

// ─── USERS MANAGEMENT ───────────────────────────────────────
export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let whereClause = '';
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause = `WHERE name ILIKE $${paramIndex} OR email ILIKE $${paramIndex}`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM users ${whereClause}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT id, name, email, role, created_at FROM users ${whereClause}
             ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        res.json({
            users: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
        }

        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (userCheck.rows[0].role === 'admin') {
            return res.status(400).json({ error: 'No podés eliminar a otro administrador' });
        }

        await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
        await pool.query('DELETE FROM pets WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'Usuario eliminado con éxito' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
        }

        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Rol actualizado', user: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando rol:', error);
        res.status(500).json({ error: 'Error actualizando rol' });
    }
};

// ─── PETS MANAGEMENT ────────────────────────────────────────
export const adminGetAllPets = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const { status, type, search } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            conditions.push(`p.status = $${paramIndex++}`);
            params.push(status);
        }
        if (type && type !== 'all') {
            conditions.push(`p.type = $${paramIndex++}`);
            params.push(type);
        }
        if (search) {
            conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM pets p JOIN users u ON p.user_id = u.id ${whereClause}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT p.id, p.name, p.description, p.status, p.type, p.color, p.photo_url,
                    p.lat, p.lng, p.created_at, p.contact_info,
                    u.name AS reporter_name, u.email AS reporter_email, u.id AS user_id
             FROM pets p
             JOIN users u ON p.user_id = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        res.json({
            pets: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error obteniendo mascotas (admin):', error);
        res.status(500).json({ error: 'Error obteniendo mascotas' });
    }
};

export const adminDeletePet = async (req, res) => {
    try {
        const petId = req.params.id;

        await pool.query('DELETE FROM messages WHERE pet_id = $1', [petId]);
        const result = await pool.query('DELETE FROM pets WHERE id = $1 RETURNING *', [petId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        res.json({ message: 'Reporte eliminado con éxito' });
    } catch (error) {
        console.error('Error eliminando reporte (admin):', error);
        res.status(500).json({ error: 'Error eliminando reporte' });
    }
};

// ─── MESSAGES MANAGEMENT ────────────────────────────────────
export const adminGetConversations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let havingClause = '';
        const params = [];
        let paramIndex = 1;

        if (search) {
            havingClause = `HAVING MIN(u1.name) ILIKE $${paramIndex} OR MIN(u2.name) ILIKE $${paramIndex} OR MIN(p.name) ILIKE $${paramIndex}`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = `
            SELECT COUNT(*) FROM (
                SELECT 1
                FROM messages m
                JOIN users u1 ON u1.id = LEAST(m.sender_id, m.receiver_id)
                JOIN users u2 ON u2.id = GREATEST(m.sender_id, m.receiver_id)
                LEFT JOIN pets p ON m.pet_id = p.id
                GROUP BY m.pet_id, LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id)
                ${havingClause}
            ) sub
        `;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT
                m.pet_id,
                LEAST(m.sender_id, m.receiver_id) AS user_a_id,
                GREATEST(m.sender_id, m.receiver_id) AS user_b_id,
                MIN(u1.name) AS user_a_name,
                MIN(u2.name) AS user_b_name,
                MIN(p.name) AS pet_name,
                MIN(p.photo_url) AS pet_photo,
                COUNT(*) AS message_count,
                MAX(m.created_at) AS last_message_at
             FROM messages m
             JOIN users u1 ON u1.id = LEAST(m.sender_id, m.receiver_id)
             JOIN users u2 ON u2.id = GREATEST(m.sender_id, m.receiver_id)
             LEFT JOIN pets p ON m.pet_id = p.id
             GROUP BY m.pet_id, LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id)
             ${havingClause}
             ORDER BY MAX(m.created_at) DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        res.json({
            conversations: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error obteniendo conversaciones (admin):', error);
        res.status(500).json({ error: 'Error obteniendo conversaciones' });
    }
};

export const adminGetConversationMessages = async (req, res) => {
    try {
        const { pet_id, user_a, user_b } = req.params;

        const result = await pool.query(
            `SELECT m.id, m.content, m.created_at, m.is_read,
                    m.sender_id, us.name AS sender_name,
                    m.receiver_id, ur.name AS receiver_name
             FROM messages m
             JOIN users us ON m.sender_id = us.id
             JOIN users ur ON m.receiver_id = ur.id
             WHERE m.pet_id = $1
               AND LEAST(m.sender_id, m.receiver_id) = $2
               AND GREATEST(m.sender_id, m.receiver_id) = $3
             ORDER BY m.created_at ASC`,
            [pet_id, Math.min(user_a, user_b), Math.max(user_a, user_b)]
        );

        res.json({ messages: result.rows });
    } catch (error) {
        console.error('Error obteniendo mensajes de conversación:', error);
        res.status(500).json({ error: 'Error obteniendo mensajes' });
    }
};

export const adminDeleteMessage = async (req, res) => {
    try {
        const messageId = req.params.id;

        const result = await pool.query('DELETE FROM messages WHERE id = $1 RETURNING *', [messageId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        res.json({ message: 'Mensaje eliminado con éxito' });
    } catch (error) {
        console.error('Error eliminando mensaje (admin):', error);
        res.status(500).json({ error: 'Error eliminando mensaje' });
    }
};
