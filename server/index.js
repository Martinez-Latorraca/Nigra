import express from 'express';
import cors from 'cors';
import { loadModel } from './ai.js';
import { Server } from 'socket.io';
import http from 'http';
import pool from './db.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';

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

    socket.on('register_user', (userId) => {
        if (userId) {
            const userRoom = `user_${userId}`;
            socket.join(userRoom);
            // console.log(`🔔 Usuario ${userId} registrado en su sala privada: ${userRoom}`);
        }
    });

    // Unirse a la sala de la mascota
    socket.on('join_pet_chat', ({ petId }) => {
        const room = `pet_${petId}`;
        socket.join(room);
        // console.log(`📍 Socket ${socket.id} entró a la sala de chat: ${room}`);
    });

    // RECIBIR mensaje del frontend 
    socket.on('send_pet_message', async (data) => {
        const { petId, senderId, receiverId, content } = data;

        try {
            // 💾 Guardamos en la base de datos
            await pool.query(
                'INSERT INTO messages (pet_id, sender_id, receiver_id, content) VALUES ($1, $2, $3, $4)',
                [petId, senderId, receiverId, content]
            );

            // Emitimos a la sala y la notificación como antes
            const room = `pet_${petId}`;
            io.to(room).emit('receive_pet_message', data);
            if (receiverId) {
                io.to(`user_${receiverId}`).emit('new_notification', data);
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

// Inicialización del Servidor
server.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    console.log(`🚀 Servidor listo y escuchando en http://localhost:${port}`);
});