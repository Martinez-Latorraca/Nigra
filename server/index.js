import express from 'express';
import cors from 'cors';
import { loadModel } from './ai.js';
import { Server } from 'socket.io';
import http from 'http';
import pool from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { translateColor, translateType } from './utils/translations.js';
import { reverseGeocode } from './utils/geocode.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import messageRoutes from './routes/messagesRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { globalLimiter } from './middlewares/rateLimiter.js';

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Middlewares globales
app.use(cors({
    origin: ["https://nigra-server.onrender.com", "http://localhost:5173"]
}));
app.use(express.json());
app.use('/api', globalLimiter);

// 2. Servir archivos estáticos (¡Vital para que React cargue sus JS/CSS!)
// Asumo que tu carpeta de build se llama 'build' o 'dist'
const buildPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(buildPath));

// 3. RUTAS DE LA API (Siempre van ARRIBA del SEO y el Catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// 4. SITEMAP DINÁMICO
app.get('/sitemap.xml', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, created_at FROM pets ORDER BY created_at DESC');
        const baseUrl = 'https://nigra-server.onrender.com';

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/pets</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/buscar</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;

        for (const pet of result.rows) {
            const lastmod = new Date(pet.created_at).toISOString().split('T')[0];
            xml += `\n  <url><loc>${baseUrl}/pet/${pet.id}</loc><lastmod>${lastmod}</lastmod><priority>0.6</priority></url>`;
        }

        xml += '\n</urlset>';
        res.header('Content-Type', 'application/xml').send(xml);
    } catch (error) {
        console.error('Error sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

// 5. RUTA DE SEO INJECTION (Para compartir en RRSS)
// Inyectamos los meta tags OG dinámicos en el index.html de React para TODOS (bot y humano)
const indexHtmlPath = path.join(buildPath, 'index.html');
const indexHtml = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf-8') : null;

app.get('/pet/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
        const pet = result.rows[0];

        if (!pet || !indexHtml) return indexHtml ? res.send(indexHtml) : res.status(404).json({ error: 'Not found' });

        const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const petName = pet.name || 'una mascota';
        const petType = translateType(pet.type) || 'mascota';
        const petColor = translateColor(pet.color);
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const ogUrl = esc(`${protocol}://${req.get('host')}/pet/${id}`);
        const title = pet.status === 'lost'
            ? esc(`🔍 ¡Ayudanos a encontrar a ${petName}!`)
            : esc(`🐾 ¡Una mascota fue encontrado/a!`);
        const desc = pet.status === 'lost'
            ? esc(`Se perdió un/a ${petType}${petColor ? ' de color ' + petColor : ''}. Compartí para ayudar a que vuelva a casa.`)
            : esc(`Un/a ${petType}${petColor ? ' de color ' + petColor : ''} fue encontrado/a. Compartí para ayudar a que vuelva a casa. ¿Lo reconocés?`);
        // Forzamos imagen de 600x600 via Cloudinary para que WhatsApp móvil la muestre bien
        const ogImage = pet.photo_url.replace('/upload/', '/upload/c_fill,w_600,h_600,f_jpg,q_80/');
        const image = esc(ogImage);

        const jsonLd = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LostFoundItem",
            "name": pet.name || 'Mascota',
            "description": pet.description || desc,
            "image": ogImage,
            "url": `${protocol}://${req.get('host')}/pet/${id}`,
            "datePosted": pet.created_at,
            "category": petType,
            "color": petColor || undefined
        });

        const html = indexHtml
            .replace(/Nigra - Red de Reencuentro Animal/g, title)
            .replace(/Encontrá o reportá mascotas perdidas en tu zona\. Nigra conecta personas para ayudar a que las mascotas vuelvan a casa\./g, desc)
            .replace(/Encontrá o reportá mascotas perdidas\. Compartí para ayudar a que vuelvan a casa\./g, desc)
            .replace(/https:\/\/nigra-server\.onrender\.com\/nigra-og\.png/g, image)
            .replace(/https:\/\/nigra-server\.onrender\.com(?!\/nigra-og)/g, ogUrl)
            .replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`);

        res.send(html);

    } catch (error) {
        console.error("Error SEO:", error);
        indexHtml ? res.send(indexHtml) : res.status(500).json({ error: 'Error interno' });
    }
});

// Política de Privacidad (requerida por Meta/Google/Apple para OAuth)
app.get('/privacy', (req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidad — Nigra</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.25rem; margin-top: 2rem; }
  a { color: #1877F2; }
  .muted { color: #6b7280; font-size: 0.9rem; }
</style>
</head>
<body>
<h1>Política de Privacidad de Nigra</h1>
<p class="muted">Última actualización: ${new Date().toISOString().split('T')[0]}</p>

<p>Nigra es una aplicación que ayuda a reunir mascotas perdidas con sus familias mediante reconocimiento de imágenes y geolocalización. Esta política describe qué datos recopilamos y cómo los usamos.</p>

<h2>1. Datos que recopilamos</h2>
<ul>
  <li><strong>Datos de cuenta:</strong> nombre, correo electrónico y foto de perfil. Cuando iniciás sesión con Google, Facebook o Apple, recibimos esos datos del proveedor para crear tu cuenta.</li>
  <li><strong>Ubicación:</strong> coordenadas aproximadas, usadas solo para mostrar y emparejar mascotas perdidas o encontradas cerca tuyo.</li>
  <li><strong>Contenido que cargás:</strong> fotos de mascotas y descripciones que publicás en reportes.</li>
  <li><strong>Mensajes:</strong> el contenido de los mensajes que intercambiás con otros usuarios sobre una mascota.</li>
</ul>

<h2>2. Cómo usamos tus datos</h2>
<ul>
  <li>Autenticarte e identificar tu cuenta.</li>
  <li>Generar coincidencias visuales entre mascotas perdidas y encontradas.</li>
  <li>Mostrar resultados filtrados por cercanía geográfica.</li>
  <li>Permitir la comunicación entre usuarios para coordinar reencuentros.</li>
</ul>

<h2>3. Terceros</h2>
<p>Compartimos datos únicamente con los servicios necesarios para operar la app:</p>
<ul>
  <li><strong>Google, Facebook y Apple</strong> — autenticación (inicio de sesión).</li>
  <li><strong>Cloudinary</strong> — almacenamiento de imágenes.</li>
  <li><strong>Render y Supabase</strong> — hosting y base de datos.</li>
</ul>
<p>No vendemos tus datos personales a terceros.</p>

<h2>4. Tus derechos</h2>
<p>Podés eliminar tu cuenta y todos tus reportes y mensajes en cualquier momento desde la app. Al hacerlo, borramos tus datos asociados de nuestra base de datos.</p>

<h2>5. Contacto</h2>
<p>Por consultas sobre esta política, escribí a <a href="mailto:nicomar2004@gmail.com">nicomar2004@gmail.com</a>.</p>
</body>
</html>`);
});

// 5. CATCH-ALL (Fix para el error del asterisco)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// --- CONFIGURACIÓN DE SOCKET.IO (Se mantiene igual) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://nigra-server.onrender.com", "http://localhost:5173"],
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

        if (!pet_id || !receiver_id || !content || !content.trim()) {
            return socket.emit('error_notification', 'Faltan datos para enviar el mensaje');
        }

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
                sender_id: sender_id,
                senderName: senderName,
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

// Backfill de direcciones: geocodifica en segundo plano las mascotas que
// todavía no tienen address (las creadas antes de esta feature). Idempotente:
// solo toca las que tienen address NULL, así que en arranques posteriores no
// hace nada. Respeta el rate limit de Nominatim (~1 req/seg).
async function backfillAddresses() {
    try {
        const { rows } = await pool.query(
            'SELECT id, lat, lng FROM pets WHERE address IS NULL AND lat IS NOT NULL AND lng IS NOT NULL'
        );
        if (rows.length === 0) return;
        console.log(`📍 Backfill de direcciones: ${rows.length} pendientes`);
        for (const pet of rows) {
            const address = await reverseGeocode(pet.lat, pet.lng);
            if (address) {
                await pool.query('UPDATE pets SET address = $1 WHERE id = $2', [address, pet.id]);
            }
            await new Promise((r) => setTimeout(r, 1100));
        }
        console.log('📍 Backfill de direcciones completado');
    } catch (error) {
        console.error('Error en backfill de direcciones:', error.message);
    }
}

// 6. INICIALIZACIÓN
server.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    console.log(`🚀 Servidor listo en http://localhost:${port}`);
    backfillAddresses();
});