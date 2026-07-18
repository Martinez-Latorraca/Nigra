// Envío de emails transaccionales via Brevo API HTTP.
// Render bloquea SMTP saliente (25/465/587) en su infraestructura, así que
// no podemos usar nodemailer contra Gmail o el SMTP relay de Brevo — hay
// que ir por la API REST v3 de Brevo (HTTPS, no bloqueada).
//
// Env vars requeridas en producción:
//   SMTP_PASS      — clave xkeysib-... generada en app.brevo.com → Claves API.
//                    (El nombre "SMTP_PASS" es histórico del intento previo con
//                    Gmail SMTP; ahora guarda la API key de Brevo).
//   MAIL_FROM      — email del remitente (default: somos.mimo.app@gmail.com).
//                    Debe estar verificado como sender en Brevo o el envío falla.
//   BASE_URL       — para armar el link de reset (default: onrender).
//
// En test/dev sin SMTP_PASS, sendResetEmail devuelve { skipped: true } sin
// tirar error, para que los tests no dependan de red.

const BASE_URL = process.env.BASE_URL || 'https://mimo.uy';
const MAIL_FROM_EMAIL = process.env.MAIL_FROM || 'no-reply@mimo.uy';
const MAIL_FROM_NAME = 'Mimo';

// Sólo para tests: permite inyectar un fetch fake.
let injectedFetch = null;
export function _setFetchForTest(fake) {
    injectedFetch = fake;
}

export async function sendResetEmail({ to, token, name }) {
    if (!process.env.SMTP_PASS) {
        console.warn('📧 Mailer: SMTP_PASS (Brevo API key) no configurado, skip envío.');
        return { skipped: true };
    }

    const link = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const greeting = name ? `Hola ${name},` : 'Hola,';

    const payload = {
        sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL },
        to: [{ email: to, name: name || undefined }],
        subject: 'Recuperá tu contraseña — Mimo',
        textContent:
            `${greeting}\n\n` +
            `Alguien pidió restablecer la contraseña de tu cuenta en Mimo.\n\n` +
            `Abrí este link para elegir una nueva contraseña (válido por 1 hora):\n` +
            `${link}\n\n` +
            `Si no fuiste vos, ignorá este mensaje. Tu contraseña actual sigue siendo la misma.\n\n` +
            `— El equipo de Mimo`,
        htmlContent: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; line-height: 1.5;">
                <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #FF5C6C;">mimo</h1>
                <p style="margin: 16px 0;">${greeting}</p>
                <p style="margin: 16px 0;">Alguien pidió restablecer la contraseña de tu cuenta.</p>
                <p style="margin: 24px 0;">
                    <a href="${link}"
                       style="display: inline-block; padding: 12px 24px; background: #FF5C6C; color: #fff; text-decoration: none; border-radius: 999px; font-weight: 600;">
                       Elegir nueva contraseña
                    </a>
                </p>
                <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
                    El link es válido por 1 hora. Si no fuiste vos, ignorá este mensaje — tu contraseña sigue siendo la misma.
                </p>
                <p style="margin: 32px 0 0 0; font-size: 12px; color: #9ca3af;">— El equipo de Mimo</p>
            </div>
        `,
    };

    const doFetch = injectedFetch || fetch;
    console.log(`📧 Mailer: enviando reset a ${to} via Brevo...`);
    const res = await doFetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': process.env.SMTP_PASS,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorBody = await res.text().catch(() => '<unreadable>');
        throw new Error(`Brevo API ${res.status}: ${errorBody}`);
    }

    const data = await res.json();
    console.log(`📧 Mailer: enviado a ${to}. messageId=${data.messageId}`);
    return { skipped: false, messageId: data.messageId };
}

// Mail de verificación de email al registrarse. Similar a sendResetEmail,
// mismo transporte (Brevo API HTTP). El link lleva al front, que hace POST
// al endpoint de verify con el token.
export async function sendVerificationEmail({ to, token, name }) {
    if (!process.env.SMTP_PASS) {
        console.warn('📧 Mailer: SMTP_PASS no configurado, skip verificación.');
        return { skipped: true };
    }

    const link = `${BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const greeting = name ? `Hola ${name},` : 'Hola,';

    const payload = {
        sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL },
        to: [{ email: to, name: name || undefined }],
        subject: 'Verificá tu email — Mimo',
        textContent:
            `${greeting}\n\n` +
            `Bienvenido/a a Mimo. Confirmá tu email para activar tu cuenta:\n\n` +
            `${link}\n\n` +
            `Este link es válido por 48 horas. Si no te registraste en Mimo, ignorá este mensaje.\n\n` +
            `— El equipo de Mimo`,
        htmlContent: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; line-height: 1.5;">
                <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #FF5C6C;">mimo</h1>
                <p style="margin: 16px 0;">${greeting}</p>
                <p style="margin: 16px 0;">¡Bienvenido/a a Mimo! Confirmá tu email para activar tu cuenta.</p>
                <p style="margin: 24px 0;">
                    <a href="${link}"
                       style="display: inline-block; padding: 12px 24px; background: #FF5C6C; color: #fff; text-decoration: none; border-radius: 999px; font-weight: 600;">
                       Confirmar email
                    </a>
                </p>
                <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
                    El link es válido por 48 horas. Si no te registraste, ignorá este mensaje.
                </p>
                <p style="margin: 32px 0 0 0; font-size: 12px; color: #9ca3af;">— El equipo de Mimo</p>
            </div>
        `,
    };

    const doFetch = injectedFetch || fetch;
    console.log(`📧 Mailer: enviando verificación a ${to} via Brevo...`);
    const res = await doFetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': process.env.SMTP_PASS,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorBody = await res.text().catch(() => '<unreadable>');
        throw new Error(`Brevo API ${res.status}: ${errorBody}`);
    }

    const data = await res.json();
    console.log(`📧 Mailer: enviado a ${to}. messageId=${data.messageId}`);
    return { skipped: false, messageId: data.messageId };
}
