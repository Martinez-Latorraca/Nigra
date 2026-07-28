// Logger estructurado (pino). JSON en producción → stdout, que es lo que
// consume el drain de la plataforma (Render Log Streams → Better Stack /
// Datadog / etc). En dev, pino-pretty para leerlo cómodo en la consola.
//
// Por qué stdout y no un transporte HTTP in-app: es el estándar 12-factor —
// la app solo escribe a stdout y la plataforma se encarga de rutearlo. No
// bloquea el event loop, no agrega una dependencia de vendor y sobrevive a
// un crash del proceso (el transporte in-app se perdería los últimos logs).
//
// Redacción: nunca logueamos credenciales ni tokens, aunque aparezcan en
// headers o bodies.
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const redact = {
    paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'password',
        '*.password',
        'token',
        '*.token',
    ],
    remove: true,
};

const logger = pino({
    level,
    redact,
    base: { service: 'mimo-server' },
    // En prod dejamos que pino escriba JSON directo a stdout (sin transport,
    // más rápido). En dev, pretty.
    transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname,service',
            },
        },
});

export default logger;
