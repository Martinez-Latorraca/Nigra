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
    console.log(`Usuario conectado: ${socket.userId}`);

    // Unimos al usuario a una "sala" privada con su propio ID
    // Esto es clave para enviarle mensajes directos fácilmente
    socket.join(`user_${socket.userId}`);

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// 6. INICIALIZACIÓN
server.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    console.log(`🚀 Servidor listo en http://localhost:${port}`);
});