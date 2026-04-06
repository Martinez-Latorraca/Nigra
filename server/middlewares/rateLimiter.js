import rateLimit from 'express-rate-limit';

// General API: 100 requests per 15 min per IP
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/admin'),
    message: { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
});

// Auth (login/register): 10 requests per 15 min per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de autenticación. Intentá de nuevo en 15 minutos.' },
});

// Search (CPU-heavy, runs TensorFlow): 15 per 15 min
export const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas búsquedas. Intentá de nuevo en unos minutos.' },
});

// Report (upload + TensorFlow): 5 per 15 min
export const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados reportes. Intentá de nuevo en unos minutos.' },
});
