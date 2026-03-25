import express from 'express';
import cors from 'cors';
import { loadModel } from './ai.js';
import { Server } from 'socket.io';
import http from 'http';
import pool from './db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import messageRoutes from './routes/messagesRoutes.js';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Middlewares globales
app.use(cors());
app.use(express.json());

// 2. Servir archivos estáticos (¡Vital para que React cargue sus JS/CSS!)
// Asumo que tu carpeta de build se llama 'build' o 'dist'
const buildPath = path.resolve(__dirname, '../client/build');
app.use(express.static(buildPath));

// 3. RUTAS DE LA API (Siempre van ARRIBA del SEO y el Catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/messages', messageRoutes);

// 4. RUTA DE SEO INJECTION (Para compartir en RRSS)
// Ojo: Si en React usás /pet/:id, acá debe ser igual
app.get('/pets/:id', async (req, res) => {
    const id = req.params;
    const indexPath = path.join(buildPath, 'index.html');

    try {
        const result = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
        const pet = result.rows[0];

        if (!pet) return res.sendFile(indexPath);

        fs.readFile(indexPath, 'utf8', (err, data) => {
            if (err) return res.sendFile(indexPath);

            const title = `Nigra: ${pet.status === 'lost' ? 'Buscando a' : 'Mascota hallada:'} ${pet.description}`;
            const desc = `Especie: ${pet.type} | Color: ${pet.color}. Ayudanos a difundir en la Red Nigra.`;
            const image = pet.photo_url;

            // Reemplazo de meta tags
            let resultHTML = data
                .replace(/__OG_TITLE__/g, title)
                .replace(/__OG_DESCRIPTION__/g, desc)
                .replace(/__OG_IMAGE__/g, image);

            res.send(resultHTML);
        });
    } catch (error) {
        res.sendFile(indexPath);
    }
});

// 5. CATCH-ALL (Fix para el error del asterisco)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// --- CONFIGURACIÓN DE SOCKET.IO (Se mantiene igual) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://nigra-server.onrender.com/"],
        methods: ["GET", "POST"]
    }
});

// Middleware de autenticación para Sockets
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Error de autenticación: No hay token"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Token inválido"));

        // Guardamos el ID del usuario en el objeto socket
        socket.userId = decoded.id;
        next();
    });
});

io.on('connection', (socket) => {
    // El usuario se une a su propia sala para notificaciones generales
    socket.join(`user_${socket.userId}`);
    console.log(`👤 Usuario ${socket.userId} conectado y unido a su sala.`);

    // --- CHAT DE MASCOTAS ---

    // 1. Unirse a la sala específica del chat (opcional pero recomendado para escalabilidad)
    socket.on('join_pet_chat', ({ pet_id }) => {
        socket.join(`pet_chat_${pet_id}`);
        console.log(`🐾 Usuario ${socket.userId} se unió al chat de la mascota: ${pet_id}`);
    });

    // 2. Escuchar el envío de mensajes
    socket.on('send_pet_message', async (data) => {
        const { pet_id, receiver_id, content, petPhoto, senderName } = data;
        const sender_id = socket.userId; // Seguridad: usamos el ID del token, no el del payload

        try {
            // A. Guardar en Supabase
            // IMPORTANTE: Verifica que los nombres de columnas coincidan con tu tabla
            const query = `
                INSERT INTO messages (pet_id, sender_id, receiver_id, content, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING *
            `;
            const result = await pool.query(query, [pet_id, sender_id, receiver_id, content]);
            const newMessage = result.rows[0];

            // B. Enviar al destinatario en tiempo real
            // Enviamos a la sala privada del receptor
            io.to(`user_${receiver_id}`).emit('receive_pet_message', newMessage);

            // C. Enviar también al emisor (para que se vea en sus otras pestañas si tiene varias)
            socket.emit('receive_pet_message', newMessage);

            // D. (Extra) Notificación global para actualizar el Inbox
            io.to(`user_${receiver_id}`).emit('new_notification', {
                pet_id: pet_id,
                petPhoto: petPhoto,
                otherUserId: sender_id,
                otherUserName: senderName,
                content: content
            });

            console.log(`✉️ Mensaje guardado y enviado de ${sender_id} a ${receiver_id}`);

        } catch (error) {
            console.error('❌ Error en send_pet_message:', error);
            socket.emit('error_notification', 'No se pudo enviar el mensaje');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// 6. INICIALIZACIÓN
server.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    console.log(`🚀 Servidor listo en http://localhost:${port}`);
});