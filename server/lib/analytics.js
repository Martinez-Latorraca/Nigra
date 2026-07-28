// Product analytics (PostHog) para funnels de activación y core loop.
// Gated en POSTHOG_API_KEY: sin la env var, `track` es no-op (no rompe
// dev/test, no abre conexiones). Server-side a propósito — los eventos clave
// (registro, verificación, login, reporte, reencuentro) pasan todos por acá,
// así que son exactos y no dependen del cliente.
//
// Línea de privacidad (coherente con Sentry y la política de la app):
//  - distinct_id = user id (nunca email/nombre).
//  - properties: solo contexto de dominio (account_type, status, type,
//    outcome...), NUNCA PII ni contenido de mensajes/fotos.
//  - Sin session replay, sin autocapture (esto es server-side puro).
import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY;
// EU por default (donde creamos el proyecto). Override con POSTHOG_HOST.
const host = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com';

// Cliente único. null si no hay key → track() queda no-op.
const client = apiKey
    ? new PostHog(apiKey, {
        host,
        // Batching por tiempo: el server es long-running, no serverless.
        // Con volumen bajo, un flush cada 10s alcanza y no perdemos casi nada
        // en un deploy (SIGTERM de Render).
        flushInterval: 10_000,
        flushAt: 20,
    })
    : null;

export const analyticsEnabled = !!client;

// Encola un evento. Nunca lanza: analytics jamás debe romper un request.
// distinctId puede venir como number (user.id) → lo normalizamos a string.
export function track(distinctId, event, properties = {}) {
    if (!client || distinctId == null) return;
    try {
        client.capture({
            distinctId: String(distinctId),
            event,
            properties,
        });
    } catch (e) {
        console.error('analytics track error:', e?.message);
    }
}

// Flush pendiente antes de cerrar el proceso (deploy/restart). Best-effort.
export async function shutdownAnalytics() {
    if (!client) return;
    try {
        await client.shutdown();
    } catch (e) {
        console.error('analytics shutdown error:', e?.message);
    }
}
