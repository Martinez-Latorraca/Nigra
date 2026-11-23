// Sentry PRIMERO — instrumenta http/express/pg antes de que se importen.
import './instrument.js';
import * as Sentry from '@sentry/node';

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
import shelterRoutes from './routes/shelterRoutes.js';
import adoptionPetRoutes from './routes/adoptionPetRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import messageRoutes from './routes/messagesRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import adsRoutes from './routes/adsRoutes.js';
import { sendExpoPush, startReceiptScheduler } from './utils/push.js';
import { globalLimiter, geocodeLimiter } from './middlewares/rateLimiter.js';
import { authenticateToken } from './middlewares/auth.js';
import { handleSendPetMessage, handleJoinPetChat } from './lib/socketHandlers.js';
import { startReminderScheduler } from './lib/resolveReminder.js';
import { analyticsEnabled, shutdownAnalytics } from './lib/analytics.js';
import { CONTACT_EMAIL } from './lib/contact.js';
import pinoHttp from 'pino-http';
import logger from './lib/logger.js';

// Fail fast si falta el secreto de firmar JWTs. Sin este check el server
// arrancaba "funcionando" con jwt.sign(payload, undefined) → firma con la
// string "undefined", vulnerable a que cualquiera firme tokens del server.
if (!process.env.JWT_SECRET) {
    logger.fatal('FATAL: JWT_SECRET no está configurado en el entorno.');
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
// Request logging estructurado. Va primero para cubrir todo. Ignoramos el
// health check y los assets estáticos para no ahogar los logs con ruido.
// customLogLevel: 5xx→error, 4xx→warn, resto info.
app.use(pinoHttp({
    logger,
    autoLogging: {
        ignore: (req) => {
            const url = req.url || '';
            return url === '/api/health'
                || url.startsWith('/assets')
                || url === '/favicon.ico'
                || /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|map)(\?|$)/.test(url);
        },
    },
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    // Serializers mínimos. Los de pino-http por default vuelcan TODOS los
    // headers, lo que traía dos problemas:
    //  1) Privacidad: la IP del usuario aparecía tres veces por request
    //     (cf-connecting-ip, true-client-ip, x-forwarded-for). No la
    //     necesitamos para operar y no queremos guardarla — menos todavía si
    //     los logs van a un drain externo.
    //  2) Ruido: ~2.5KB por request hacía los logs imposibles de leer.
    // Con esto queda ~150 bytes y solo lo accionable. cf-ipcountry se conserva
    // porque es país (no identifica a nadie) y sirve para entender el tráfico.
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            country: req.headers?.['cf-ipcountry'],
        }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
}));
app.use(cors({
    origin: ["https://mimo.uy", "https://www.mimo.uy", "http://localhost:5173"]
}));
app.use(express.json());
app.use('/api', globalLimiter);

// Health check liviano — para monitores de uptime / alerting. No toca la DB
// para no fallar por un cold start de Supabase; solo confirma que el proceso vive.
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 2. Servir archivos estáticos (¡Vital para que React cargue sus JS/CSS!)
// Asumo que tu carpeta de build se llama 'build' o 'dist'
const buildPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(buildPath));

// 3. RUTAS DE LA API (Siempre van ARRIBA del SEO y el Catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/vets', vetRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/adoption-pets', adoptionPetRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ads', adsRoutes);

// 4. SITEMAP DINÁMICO
app.get('/sitemap.xml', async (req, res) => {
    try {
        // Paralelizamos 4 queries: pets, vets, shelters, adoption_pets. Todas
        // filtradas por lo que Google debería indexar (aprobado + no borrado).
        const [petsRes, vetsRes, sheltersRes, adoptionsRes] = await Promise.all([
            pool.query('SELECT id, created_at FROM pets ORDER BY created_at DESC'),
            pool.query(
                `SELECT slug, updated_at FROM vets
                 WHERE approved = TRUE AND deleted_at IS NULL
                 ORDER BY updated_at DESC`
            ),
            pool.query(
                `SELECT slug, updated_at FROM shelters
                 WHERE approved = TRUE AND deleted_at IS NULL
                 ORDER BY updated_at DESC`
            ),
            pool.query(
                `SELECT ap.id, ap.updated_at
                 FROM adoption_pets ap
                 JOIN shelters s ON s.id = ap.shelter_id
                 WHERE ap.deleted_at IS NULL AND ap.adopted_at IS NULL
                   AND s.approved = TRUE AND s.deleted_at IS NULL
                 ORDER BY ap.created_at DESC`
            ),
        ]);
        const baseUrl = BASE_URL;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/pets</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/vets</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/shelters</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/adoptions</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/buscar</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;

        for (const pet of petsRes.rows) {
            const lastmod = new Date(pet.created_at).toISOString().split('T')[0];
            xml += `\n  <url><loc>${baseUrl}/pet/${pet.id}</loc><lastmod>${lastmod}</lastmod><priority>0.6</priority></url>`;
        }
        for (const v of vetsRes.rows) {
            const lastmod = new Date(v.updated_at).toISOString().split('T')[0];
            xml += `\n  <url><loc>${baseUrl}/vets/${v.slug}</loc><lastmod>${lastmod}</lastmod><priority>0.5</priority></url>`;
        }
        for (const s of sheltersRes.rows) {
            const lastmod = new Date(s.updated_at).toISOString().split('T')[0];
            xml += `\n  <url><loc>${baseUrl}/shelters/${s.slug}</loc><lastmod>${lastmod}</lastmod><priority>0.5</priority></url>`;
        }
        for (const ap of adoptionsRes.rows) {
            const lastmod = new Date(ap.updated_at).toISOString().split('T')[0];
            xml += `\n  <url><loc>${baseUrl}/adoptions/${ap.id}</loc><lastmod>${lastmod}</lastmod><priority>0.6</priority></url>`;
        }

        xml += '\n</urlset>';
        res.header('Content-Type', 'application/xml').send(xml);
    } catch (error) {
        logger.error({ err: error }, 'sitemap error');
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
            .replace(/https:\/\/mimo\.uy\/mimo-og\.png/g, image)
            .replace(/https:\/\/mimo\.uy(?!\/mimo-og)/g, ogUrl)
            .replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`);

        res.send(html);

    } catch (error) {
        logger.error({ err: error }, 'SEO injection error');
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
    // Diseño: Privacidad.dc.html (handoff). El texto legal es el de siempre;
    // solo cambió el HTML/CSS.
    const FECHA = new Date().toISOString().split('T')[0];
    res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidad — Mimo</title>
<link rel="icon" type="image/png" href="/mimo-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; background: #FFF6F0; }
  html { scroll-behavior: smooth; }
  a { color: #1A1A2E; } a:hover { color: #FF5C6C; }
  section[id] { scroll-margin-top: 24px; }
  .pv-root { min-height: 100vh; }
  .pv-body > div:last-child { min-width: 0; }
  @media (max-width: 1000px) {
    .pv-navlinks a:not(:last-child) { display: none !important; }
    .pv-toc { display: none !important; }
  }
  @media (max-width: 720px) {
    .pv-nav { padding: 20px !important; }
    .pv-navlinks { display: none !important; }
    .pv-hero { padding: 24px 20px 40px !important; }
    .pv-h1 { font-size: 40px !important; }
    .pv-body { padding: 0 16px 64px !important; }
    .pv-card { padding: 22px !important; }
    .pv-grid3 { grid-template-columns: 1fr !important; }
    .pv-footer { padding: 56px 20px 32px !important; }
    .pv-fgrid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .pv-fgrid > div:first-child { grid-column: 1 / -1; }
  }
</style>
</head>
<body>
<div class="pv-root" style=" display: flex; flex-direction: column; background: #FFF6F0; font-family: 'DM Sans', sans-serif; color: #1A1A2E"><section style="position: relative; overflow: hidden; background: #FFF6F0"><nav class="pv-nav" aria-label="Principal" style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 24px 80px">
<a href="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none"><span style="display: inline-flex; flex: 0 0 auto; width: 40px; height: 49px; overflow: hidden"><img src="/landing/pin.svg" alt="" width="40" height="49" style="display:block"></span><span style="font-family: Nunito, sans-serif; font-weight: 800; font-size: 34px; line-height: 1; color: #1A1A2E">m<span style="background: linear-gradient(to bottom, #FF5C6C 0, #FF5C6C 0.47em, #1A1A2E 0.47em); -webkit-background-clip: text; background-clip: text; color: transparent">i</span>mo</span></a>
<div class="pv-navlinks" style="display: flex; align-items: center; gap: 36px"><a href="/#como" style="font-size: 16px; font-weight: 700; color: #1A1A2E; text-decoration: none">Cómo funciona</a><a href="/#vets" style="font-size: 16px; font-weight: 700; color: #1A1A2E; text-decoration: none">Vets y refugios</a><a href="/#apoyar" style="font-size: 16px; font-weight: 700; color: #1A1A2E; text-decoration: none">Apoyar</a><a href="/#faq" style="font-size: 16px; font-weight: 700; color: #1A1A2E; text-decoration: none">Preguntas</a><a href="/#descargar" style="display: flex; align-items: center; height: 48px; padding: 0 22px; border-radius: 16px; background: #FF5C6C; color: #F0EBE8; font-size: 16px; font-weight: 700; text-decoration: none">Avisame cuando salga</a></div></nav>
<div class="pv-hero" style="padding: 40px 80px 56px; display: flex; flex-direction: column; gap: 14px; max-width: 900px">
<a href="/" style="align-self: flex-start; display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; color: #1A1A2E; text-decoration: none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>Volver a mimo.uy</a>
<p style="margin: 8px 0 0; font-size: 14px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #FF5C6C">Legal</p>
<h1 style="margin: 0; font-family: Nunito, sans-serif; font-weight: 900; font-size: 60px; line-height: 1.05" class="pv-h1">Política de Privacidad de Mimo</h1>
<span style="align-self: flex-start; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 999px; background: #FFFFFF; font-size: 14px; font-weight: 700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>Última actualización: ${FECHA}</span>
<p style="margin: 6px 0 0; font-size: 20px; line-height: 1.55">Mimo es una aplicación que ayuda a reunir mascotas perdidas con sus familias mediante reconocimiento de imágenes y geolocalización. Esta política describe qué datos recopilamos y cómo los usamos.</p></div></section><div style="flex: 1; display: flex; flex-direction: column; background: #FFF6F0"><div class="pv-body" style="padding: 0 80px 96px; display: flex; gap: 48px; align-items: flex-start; background: #FFF6F0">
<aside class="pv-toc" style="flex: 0 0 280px; position: sticky; top: 24px; display: flex; flex-direction: column; gap: 4px"><p style="margin: 0 0 8px 12px; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase">En esta página</p><a href="#datos" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; text-decoration: none; color: #1A1A2E; font-size: 15px; font-weight: 700; background: #FFFFFF"><span style="width: 10px; height: 10px; border-radius: 50%; background: #FF5C6C"></span>1. Datos que recopilamos</a><a href="#uso" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; text-decoration: none; color: #1A1A2E; font-size: 15px; font-weight: 500; "><span style="width: 10px; height: 10px; border-radius: 50%; background: #FFB830"></span>2. Cómo usamos tus datos</a><a href="#terceros" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; text-decoration: none; color: #1A1A2E; font-size: 15px; font-weight: 500; "><span style="width: 10px; height: 10px; border-radius: 50%; background: #3ECFB2"></span>3. Terceros</a><a href="#derechos" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; text-decoration: none; color: #1A1A2E; font-size: 15px; font-weight: 500; "><span style="width: 10px; height: 10px; border-radius: 50%; background: #9B6DFF"></span>4. Tus derechos</a><a href="#contacto" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; text-decoration: none; color: #1A1A2E; font-size: 15px; font-weight: 500; "><span style="width: 10px; height: 10px; border-radius: 50%; background: #1A1A2E"></span>5. Contacto</a></aside>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px"><section id="datos" class="pv-card" style="padding: 32px; border-radius: 28px; background: #FFFFFF; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; align-items: center; gap: 14px"><span style="flex: 0 0 48px; height: 48px; border-radius: 16px; background: #FF5C6C; display: flex; align-items: center; justify-content: center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F0EBE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></svg></span><h2 style="margin: 0; font-family: Nunito, sans-serif; font-weight: 900; font-size: 26px">1. Datos que recopilamos</h2></div><ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px"><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px"><b>Datos de cuenta:</b> nombre, correo electrónico y foto de perfil. Cuando iniciás sesión con Google, Facebook o Apple, recibimos esos datos del proveedor para crear tu cuenta.</span></li><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px"><b>Ubicación:</b> coordenadas aproximadas, usadas solo para mostrar y emparejar mascotas perdidas o encontradas cerca tuyo.</span></li><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" /><circle cx="12" cy="13" r="3" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px"><b>Contenido que cargás:</b> fotos de mascotas y descripciones que publicás en reportes.</span></li><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px"><b>Mensajes:</b> el contenido de los mensajes que intercambiás con otros usuarios sobre una mascota.</span></li></ul></section><section id="uso" class="pv-card" style="padding: 32px; border-radius: 28px; background: #FFFFFF; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; align-items: center; gap: 14px"><span style="flex: 0 0 48px; height: 48px; border-radius: 16px; background: #FFB830; display: flex; align-items: center; justify-content: center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F0EBE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg></span><h2 style="margin: 0; font-family: Nunito, sans-serif; font-weight: 900; font-size: 26px">2. Cómo usamos tus datos</h2></div><ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px"><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB830" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px">Autenticarte e identificar tu cuenta.</span></li><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB830" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /><path d="m16 16-1.9-1.9" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px">Generar coincidencias visuales entre mascotas perdidas y encontradas.</span></li><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB830" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><line x1="2" x2="5" y1="12" y2="12" /><line x1="19" x2="22" y1="12" y2="12" /><line x1="12" x2="12" y1="2" y2="5" /><line x1="12" x2="12" y1="19" y2="22" /><circle cx="12" cy="12" r="7" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px">Mostrar resultados filtrados por cercanía geográfica.</span></li><li style="display: flex; gap: 14px; align-items: flex-start"><span style="flex: 0 0 36px; height: 36px; border-radius: 12px; background: #FFF6F0; display: flex; align-items: center; justify-content: center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB830" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" /></svg></span><span style="font-size: 17px; line-height: 1.6; padding-top: 4px">Permitir la comunicación entre usuarios para coordinar reencuentros.</span></li></ul></section><section id="terceros" class="pv-card" style="padding: 32px; border-radius: 28px; background: #FFFFFF; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; align-items: center; gap: 14px"><span style="flex: 0 0 48px; height: 48px; border-radius: 16px; background: #3ECFB2; display: flex; align-items: center; justify-content: center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F0EBE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg></span><h2 style="margin: 0; font-family: Nunito, sans-serif; font-weight: 900; font-size: 26px">3. Terceros</h2></div><p style="margin: 0; font-size: 17px; line-height: 1.6">Compartimos datos únicamente con los servicios necesarios para operar la app:</p><div class="pv-grid3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px"><div style="padding: 18px; border-radius: 20px; background: #FFF6F0; display: flex; flex-direction: column; gap: 8px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ECFB2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></svg><b style="font-size: 16px">Google, Facebook y Apple</b><span style="font-size: 15px; line-height: 1.5">— autenticación (inicio de sesión).</span></div><div style="padding: 18px; border-radius: 20px; background: #FFF6F0; display: flex; flex-direction: column; gap: 8px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ECFB2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg><b style="font-size: 16px">Cloudinary</b><span style="font-size: 15px; line-height: 1.5">— almacenamiento de imágenes.</span></div><div style="padding: 18px; border-radius: 20px; background: #FFF6F0; display: flex; flex-direction: column; gap: 8px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ECFB2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" /></svg><b style="font-size: 16px">Render y Supabase</b><span style="font-size: 15px; line-height: 1.5">— hosting y base de datos.</span></div></div><p style="margin: 0; display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-radius: 18px; background: #3ECFB2; color: #F0EBE8; font-size: 17px; font-weight: 700"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F0EBE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>No vendemos tus datos personales a terceros.</p></section><section id="derechos" class="pv-card" style="padding: 32px; border-radius: 28px; background: #FFFFFF; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; align-items: center; gap: 14px"><span style="flex: 0 0 48px; height: 48px; border-radius: 16px; background: #9B6DFF; display: flex; align-items: center; justify-content: center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F0EBE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="m16 11 2 2 4-4" /><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></span><h2 style="margin: 0; font-family: Nunito, sans-serif; font-weight: 900; font-size: 26px">4. Tus derechos</h2></div><p style="margin: 0; font-size: 17px; line-height: 1.6">Podés eliminar tu cuenta y todos tus reportes y mensajes en cualquier momento desde la app. Al hacerlo, borramos tus datos asociados de nuestra base de datos.</p></section><section id="contacto" class="pv-card" style="padding: 32px; border-radius: 28px; background: #FFFFFF; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; align-items: center; gap: 14px"><span style="flex: 0 0 48px; height: 48px; border-radius: 16px; background: #1A1A2E; display: flex; align-items: center; justify-content: center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg></span><h2 style="margin: 0; font-family: Nunito, sans-serif; font-weight: 900; font-size: 26px">5. Contacto</h2></div><p style="margin: 0; font-size: 17px; line-height: 1.6">Por consultas sobre esta política, escribí a:</p><a href="mailto:${CONTACT_EMAIL}" style="align-self: flex-start; display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 24px; border-radius: 18px; background: #1A1A2E; color: #FFF6F0; font-size: 17px; font-weight: 700; text-decoration: none"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>${CONTACT_EMAIL}</a></section></div></div></div><footer class="pv-footer" style="padding: 72px 80px 40px; background: #1A1A2E; color: #FFF6F0; display: flex; flex-direction: column; gap: 56px">
<div class="pv-fgrid" style="display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 48px; align-items: start">
<div style="display: flex; flex-direction: column; gap: 18px; max-width: 380px">
<div style="display: flex; align-items: center; gap: 10px"><span style="display: inline-flex; flex: 0 0 auto; width: 36px; height: 44px; overflow: hidden"><img src="/landing/pin.svg" alt="" width="36" height="44" style="display:block"></span><span style="font-family: Nunito, sans-serif; font-weight: 800; font-size: 30px; line-height: 1; color: #FFF6F0">m<span style="background: linear-gradient(to bottom, #FF5C6C 0, #FF5C6C 0.47em, #FFF6F0 0.47em); -webkit-background-clip: text; background-clip: text; color: transparent">i</span>mo</span></div>
<p style="margin: 0; font-size: 16px; line-height: 1.55">Comunidad de reencuentro animal. Hecha en Uruguay para que cada mascota vuelva a casa.</p>
<span style="align-self: flex-start; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 999px; background: #262642; font-size: 13px; font-weight: 700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>Próximamente en iPhone y Android</span></div>
<div style="display: flex; flex-direction: column; gap: 14px"><p style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #B4B4C6">Mimo</p><a href="/#como" style="font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none">Cómo funciona</a><a href="/#faq" style="font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none">Preguntas frecuentes</a><a href="/#apoyar" style="font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none">Apoyar</a></div>
<div style="display: flex; flex-direction: column; gap: 14px"><p style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #B4B4C6">Sumate</p><a href="/#vets" style="font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none">Veterinarias</a><a href="/#vets" style="font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none">Refugios</a><a href="/#vets" style="font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none">Socio Mimo</a></div>
<div style="display: flex; flex-direction: column; gap: 14px"><p style="margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #B4B4C6">Contacto</p>
<a href="mailto:${CONTACT_EMAIL}" style="display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>${CONTACT_EMAIL}</a>
<a href="https://www.instagram.com/somos.mimo.uy/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 500; color: #FFF6F0; text-decoration: none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: 0 0 auto"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></svg>somos.mimo.uy</a></div>
</div>
<div style="display: flex; align-items: center; justify-content: space-between; padding-top: 28px; border-top: 1px solid #33334F; font-size: 14px; color: #B4B4C6"><span>© 2026 Mimo · mimo.uy</span><span style="display: flex; gap: 28px"><a href="/privacy" style="color: #B4B4C6; text-decoration: none">Privacidad</a></span></div></footer></div>
</body>
</html>`);
});

// 5. CATCH-ALL (Fix para el error del asterisco)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// Sentry: captura los errores que llegan al error-handling de Express.
// Va después de todas las rutas. Si SENTRY_DSN no está seteado, es no-op.
Sentry.setupExpressErrorHandler(app);

// Handler final: responde 500 limpio en JSON sin filtrar el stack al cliente.
// (Sentry ya capturó el error arriba; acá solo cerramos la respuesta.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
    (req.log || logger).error({ err }, 'unhandled error');
    if (res.headersSent) return;
    res.status(500).json({ error: 'Error interno del servidor.' });
});

// --- CONFIGURACIÓN DE SOCKET.IO (Se mantiene igual) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://mimo.uy", "https://www.mimo.uy", "http://localhost:5173"],
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
    logger.info({ userId: socket.userId }, '👤 usuario conectado y unido a su sala');

    socket.on('join_pet_chat', (data) => {
        handleJoinPetChat({ socket, data });
    });

    socket.on('send_pet_message', (data) => {
        handleSendPetMessage({ pool, io, sendExpoPush, socket, data });
    });

    socket.on('disconnect', () => {
        logger.info({ userId: socket.userId }, 'usuario desconectado');
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
        logger.info(`📍 Backfill de direcciones: ${rows.length} pendientes`);
        for (const pet of rows) {
            const address = await reverseGeocode(pet.lat, pet.lng);
            if (address) {
                await pool.query('UPDATE pets SET address = $1 WHERE id = $2', [address, pet.id]);
            }
            await new Promise((r) => setTimeout(r, 1100));
        }
        logger.info('📍 Backfill de direcciones completado');
    } catch (error) {
        logger.error({ err: error }, 'backfill de direcciones error');
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

        // Embeddings adicionales por mascota (las fotos extra que el dueño sube).
        // pets.embedding sigue siendo el de la foto principal; acá van los de
        // extra_photos. El matching toma la MENOR distancia entre la query y
        // CUALQUIER vector de la mascota (max-similarity): con 4 fotos de
        // ángulos distintos, alcanza con que una matchee para que salte.
        // Asimetría del problema: el dueño tiene el rollo entero (galería rica),
        // el que encuentra tiene 1 foto apurada. Esto explota esa asimetría.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pet_embeddings (
                id SERIAL PRIMARY KEY,
                pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
                embedding vector(1280) NOT NULL,
                source TEXT NOT NULL DEFAULT 'extra',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query('CREATE INDEX IF NOT EXISTS pet_embeddings_pet_id_idx ON pet_embeddings(pet_id)');

        // Emails vetados por moderación.
        //
        // El soft delete SOLO no alcanza para expulsar a alguien: /register
        // reactiva una cuenta soft-borrada con el mismo email, así que el
        // usuario volvía con sus mascotas y chats intactos. Esta tabla es lo
        // que hace efectivo el bloqueo, y se consulta tanto en el registro
        // como en el login social (si no, entraba con Google).
        //
        // Guardamos el email en minúsculas y comparamos siempre con LOWER()
        // para que no se esquive cambiando mayúsculas.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS banned_emails (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                user_id INTEGER,
                report_id INTEGER,
                reason TEXT,
                banned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS banned_emails_email_idx ON banned_emails (LOWER(email))');

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
        for (const table of ['users', 'pets', 'messages', 'notifications', 'password_resets', 'pet_embeddings', 'banned_emails']) {
            await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        }
    } catch (error) {
        logger.error({ err: error }, 'ensureSchema error');
    }
}

// 6. INICIALIZACIÓN
server.listen(port, async () => {
    logger.info('⏳ Cargando IA y arrancando servidor...');
    await loadModel();
    await ensureSchema();
    logger.info(`🚀 Servidor listo en http://localhost:${port}`);
    logger.info(process.env.SENTRY_DSN ? '🛡️  Sentry activo (error tracking).' : '🛡️  Sentry inactivo (sin SENTRY_DSN).');
    logger.info(analyticsEnabled ? '📊 PostHog activo (product analytics).' : '📊 PostHog inactivo (sin POSTHOG_API_KEY).');
    backfillAddresses();
    // Cron interno: reminder de "cerrá el caso" al dueño 1h después del
    // último mensaje. En Render free sobrevive mientras no haya cold start.
    startReminderScheduler({ pool, io, sendExpoPush });
    // Cron interno: chequea receipts de push y poda tokens muertos
    // (DeviceNotRegistered) cada 15 min.
    startReceiptScheduler();
});

// Shutdown ordenado: en un deploy Render manda SIGTERM. Flusheamos los eventos
// de PostHog que quedaron en el buffer antes de salir (best-effort, con techo
// de 2s para no colgar el restart). Sin analytics activo, el shutdown es
// instantáneo. Node por default sale en SIGTERM; al registrar el handler nos
// hacemos cargo de llamar a process.exit nosotros.
for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
        try {
            await Promise.race([
                shutdownAnalytics(),
                new Promise((r) => setTimeout(r, 2000)),
            ]);
        } finally {
            process.exit(0);
        }
    });
}