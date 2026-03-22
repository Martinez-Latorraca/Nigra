import express from 'express';
import cors from 'cors';
import { loadModel } from './ai.js';
import { Server } from 'socket.io';
import http from 'http';
import pool from './db.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import messageRoutes from './routes/messagesRoutes.js';

const app = express();
const port = 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Configuración del servidor
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:5173' } });

io.on('connection', (socket) => {
    console.log('✅ Usuario conectado al socket:', socket.id);

    socket.on('register_user', (user_id) => {
        if (user_id) {
            const userRoom = `user_${user_id}`;
            socket.join(userRoom);
            // console.log(`🔔 Usuario ${user_id} registrado en su sala privada: ${userRoom}`);
        }
    });

    // Unirse a la sala de la mascota
    socket.on('join_pet_chat', ({ pet_id }) => {
        const room = `pet_${pet_id}`;
        socket.join(room);
        // console.log(`📍 Socket ${socket.id} entró a la sala de chat: ${room}`);
    });

    // RECIBIR mensaje del frontend 
    socket.on('send_pet_message', async (data) => {
        const { pet_id, sender_id, receiver_id, content } = data;

        try {
            // 💾 Guardamos en la base de datos
            await pool.query(
                'INSERT INTO messages (pet_id, sender_id, receiver_id, content) VALUES ($1, $2, $3, $4)',
                [pet_id, sender_id, receiver_id, content]
            );

            // Emitimos a la sala y la notificación como antes
            const room = `pet_${pet_id}`;
            io.to(room).emit('receive_pet_message', data);
            if (receiver_id) {
                io.to(`user_${receiver_id}`).emit('new_notification', data);
            }
        } catch (err) {
            console.error("Error guardando mensaje:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Usuario desconectado');
    });
});

// Montar las rutas
app.use('/api/auth', authRoutes); // Rutas de auth 
app.use('/api/pets', petRoutes);  // Rutas de mascotas 
app.use('/api/messages', messageRoutes); // Rutas de mensajes

// Inicialización del Servidor
server.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    console.log(`🚀 Servidor listo y escuchando en http://localhost:${port}`);
});