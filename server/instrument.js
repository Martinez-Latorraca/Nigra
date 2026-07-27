// Inicialización de Sentry (error tracking del server).
//
// DEBE importarse ANTES que cualquier otro módulo — por eso es el primer
// import de index.js. Así Sentry puede instrumentar http/express/pg.
//
// Gated en SENTRY_DSN: sin la env var el SDK queda deshabilitado
// (captureException es no-op, sin llamadas de red). No rompe dev ni tests.
// La DSN se saca de sentry.io (proyecto Node) y se setea como env var en Render.
import * as Sentry from '@sentry/node';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Solo error tracking, sin performance tracing (ahorra cuota + overhead).
    tracesSampleRate: 0,
    // No mandar PII por default — coherente con la línea de privacidad del
    // proyecto (nada de emails/IPs de users a un tercero salvo lo mínimo).
    sendDefaultPii: false,
});
