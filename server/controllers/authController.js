import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, passwordHash]
        );

        res.json({ success: true, user: newUser.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el login' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const user_id = req.user.id;

        // 1. Borramos sus mensajes (enviados y recibidos)
        await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user_id]);

        // 2. Borramos sus mascotas
        await pool.query('DELETE FROM pets WHERE user_id = $1', [user_id]);

        // 3. Borramos el usuario
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Cuenta y reportes eliminados con éxito' });
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};