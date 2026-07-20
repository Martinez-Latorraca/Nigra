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
import { reverseGeocode, searchAddress } from './utils/geocode.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import vetRoutes from './routes/vetRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import messageRoutes from './routes/messagesRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import { sendExpoPush } from './utils/push.js';
import { globalLimiter, geocodeLimiter } from './middlewares/rateLimiter.js';
import { authenticateToken } from './middlewares/auth.js';
import { handleSendPetMessage, handleJoinPetChat } from './lib/socketHandlers.js';
import { startReminderScheduler } from './lib/resolveReminder.js';

// Fail fast si falta el secreto de firmar JWTs. Sin este check el server
// arrancaba "funcionando" con jwt.sign(payload, undefined) → firma con la
// string "undefined", vulnerable a que cualquiera firme tokens del server.
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET no está configurado en el entorno.');
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;
// URL base usada en meta tags OG y JSON-LD. Antes se armaba con req.get('host')
// permitiendo host header injection (envenenamiento de tarjetas de share).
const BASE_URL = process.env.BASE_URL || 'https://mimo.uy';

// Render (y otros PaaS) ponen un proxy delante: confiamos en 1 salto
// para que express-rate-limit identifique al cliente por su IP real.
app.set('trust proxy', 1);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Middlewares globales
app.use(cors({
    origin: ["https://mimo.uy", "https://www.mimo.uy", "https://nigra-server.onrender.com", "http://localhost:5173"]
}));
app.use(express.json());
app.use('/api', globalLimiter);

// 2. Servir archivos estáticos (¡Vital para que React cargue sus JS/CSS!)
// Asumo que tu carpeta de build se llama 'build' o 'dist'
const buildPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(buildPath));

// 3. RUTAS DE LA API (Siempre van ARRIBA del SEO y el Catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/vets', vetRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

// 4. SITEMAP DINÁMICO
app.get('/sitemap.xml', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, created_at FROM pets ORDER BY created_at DESC');
        const baseUrl = BASE_URL;

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
        const ogUrl = esc(`${BASE_URL}/pet/${id}`);
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
            "url": `${BASE_URL}/pet/${id}`,
            "datePosted": pet.created_at,
            "category": petType,
            "color": petColor || undefined
        });

        const html = indexHtml
            .replace(/Mimo - Comunidad de Reencuentro Animal/g, title)
            .replace(/Encontrá o reportá mascotas perdidas en tu zona\. Mimo conecta personas para ayudar a que las mascotas vuelvan a casa\./g, desc)
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

// Búsqueda de direcciones (proxy a Google Geocoding; la key queda en el server).
// Auth + rate limit dedicado: cada request cuesta plata en la cuota de Google.
app.get('/api/geo/search', authenticateToken, geocodeLimiter, async (req, res) => {
    const results = await searchAddress(req.query.q || '');
    res.json(results);
});

// Política de Privacidad (requerida por Meta/Google/Apple para OAuth)
app.get('/privacy', (req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidad — Mimo</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.25rem; margin-top: 2rem; }
  a { color: #1877F2; }
  .muted { color: #6b7280; font-size: 0.9rem; }
</style>
</head>
<body>
<h1>Política de Privacidad de Mimo</h1>
<p class="muted">Última actualización: ${new Date().toISOString().split('T')[0]}</p>

<p>Mimo es una aplicación que ayuda a reunir mascotas perdidas con sus familias mediante reconocimiento de imágenes y geolocalización. Esta política describe qué datos recopilamos y cómo los usamos.</p>

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
        origin: ["https://mimo.uy", "https://www.mimo.uy", "https://nigra-server.onrender.com", "http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});
// Permite que controllers (ej. reportPet) emitan via req.app.locals.io.
app.locals.io = io;

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

    socket.on('join_pet_chat', (data) => {
        handleJoinPetChat({ socket, data });
    });

    socket.on('send_pet_message', (data) => {
        handleSendPetMessage({ pool, io, sendExpoPush, socket, data });
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

// Migración idempotente: agrega columnas nuevas si no existen. Se corre al
// arrancar para evitar pasos manuales. Como usa IF NOT EXISTS, en arranques
// posteriores es no-op.
async function ensureSchema() {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT');
        // Verificado por un provider OAuth (Google/Apple), o por magic link
        // (a implementar). Bloquea account takeover cross-provider vía email
        // no-verificado en cuentas locales con password.
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false');
        // Backfill: cuentas ya linkeadas a un provider quedan verificadas
        // (Google/Apple ya verificaron el email al momento del linking).
        await pool.query("UPDATE users SET email_verified = true WHERE provider IS NOT NULL AND email_verified = false");
        await pool.query('ALTER TABLE pets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP');
        // Con quién se reencontró la mascota — permite mostrar el banner de
        // donación solo en ese chat y un aviso "caso cerrado" en los otros.
        await pool.query('ALTER TABLE pets ADD COLUMN IF NOT EXISTS resolved_with_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                data JSONB NOT NULL DEFAULT '{}'::jsonb,
                read_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query('CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC)');

        // Tokens de reset de contraseña. Guardamos SOLO el hash — el token
        // en texto plano viaja al mail y nunca queda en la DB. Single-use
        // (used_at) + expiración (1h a nivel controller).
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query('CREATE INDEX IF NOT EXISTS password_resets_hash_idx ON password_resets(token_hash)');

        // Alertas de mascotas cerca del user. Guardamos la última ubicación
        // conocida (compartida por el mobile con permiso) + opt-in explícito
        // notify_nearby que se activa desde settings.
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMP');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_nearby BOOLEAN NOT NULL DEFAULT false');
        // Soft delete de cuentas. NULL = activo, timestamp = eliminado. Todas
        // las queries de auth (login/register) y directorio deben respetarlo.
        // El user puede reactivarse loguéandose (email/pass o OAuth) o
        // registrándose de nuevo con el mismo email.
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
        await pool.query('ALTER TABLE vets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
        // Granular: separar perdidas / encontradas y permitir radio configurable
        // (misma UX que las vets). Backfilleamos desde notify_nearby así los que
        // ya habían activado alertas quedan igual.
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_lost BOOLEAN NOT NULL DEFAULT false');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_found BOOLEAN NOT NULL DEFAULT false');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_radius_km INTEGER NOT NULL DEFAULT 5');
        await pool.query(`
            UPDATE users
            SET notify_lost = TRUE, notify_found = TRUE
            WHERE notify_nearby = TRUE
              AND notify_lost = FALSE
              AND notify_found = FALSE
        `);
        // Índice para la query de "users cerca" (usa la fórmula de haversine sobre
        // last_lat/lng, así que un índice básico por presencia de ubicación ayuda
        // a que la scan sea más chica).
        await pool.query('CREATE INDEX IF NOT EXISTS users_nearby_alerts_idx ON users(notify_lost, notify_found) WHERE (notify_lost = true OR notify_found = true) AND last_lat IS NOT NULL AND last_lng IS NOT NULL');

        // RLS habilitado sin policies. Nuestro server se conecta con el role
        // `postgres` de Supabase, que tiene BYPASSRLS — nuestras queries siguen
        // funcionando. Bloquea a los roles anon y authenticated que usa la
        // PostgREST auto-expuesta por Supabase (evita que alguien con la anon
        // key haga SELECT * FROM users sin auth).
        for (const table of ['users', 'pets', 'messages', 'notifications', 'password_resets']) {
            await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        }
    } catch (error) {
        console.error('Error en ensureSchema:', error.message);
    }
}

// 6. INICIALIZACIÓN
server.listen(port, async () => {
    console.log('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    await ensureSchema();
    console.log(`🚀 Servidor listo en http://localhost:${port}`);
    backfillAddresses();
    // Cron interno: reminder de "cerrá el caso" al dueño 1h después del
    // último mensaje. En Render free sobrevive mientras no haya cold start.
    startReminderScheduler({ pool, io, sendExpoPush });
});