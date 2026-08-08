// Envío de emails transaccionales via Brevo API HTTP.
// Render bloquea SMTP saliente (25/465/587) en su infraestructura, así que
// no podemos usar nodemailer contra Gmail o el SMTP relay de Brevo — hay
// que ir por la API REST v3 de Brevo (HTTPS, no bloqueada).
//
// DELIVERABILITY: el remitente DEBE ser una dirección de un dominio propio
// autenticado en Brevo (DKIM + SPF + DMARC en el DNS de mimo.uy). NO usar
// una dirección @gmail.com como `from`: Gmail publica DMARC estricto y
// mandar "como gmail.com" desde Brevo falla la alineación → spam o rechazo.
// El `from` es no-reply@mimo.uy; las respuestas de humanos van por Reply-To
// a una casilla monitoreada (MAIL_REPLY_TO).
//
// Env vars:
//   SMTP_PASS      — API key de Brevo (xkeysib-...). Nombre histórico del
//                    intento previo con Gmail SMTP.
//   MAIL_FROM      — remitente (default: no-reply@mimo.uy). Debe pertenecer a
//                    un dominio autenticado en Brevo.
//   MAIL_REPLY_TO  — a dónde llegan las respuestas (default: somos.mimo.app@gmail.com).
//   BASE_URL       — para armar los links (default: https://mimo.uy).
//
// En test/dev sin SMTP_PASS los envíos devuelven { skipped: true } sin error.

import { CONTACT_EMAIL } from './contact.js';

const BASE_URL = process.env.BASE_URL || 'https://mimo.uy';
const MAIL_FROM_EMAIL = process.env.MAIL_FROM || 'no-reply@mimo.uy';
const MAIL_FROM_NAME = 'Mimo';
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || CONTACT_EMAIL;

// Sólo para tests: permite inyectar un fetch fake.
let injectedFetch = null;
export function _setFetchForTest(fake) {
    injectedFetch = fake;
}

// Wrapper del envío Brevo. Centraliza sender, reply-to, transporte y manejo
// de error para que los distintos mails no dupliquen la lógica.
async function sendBrevoEmail({ to, name, subject, textContent, htmlContent, logLabel }) {
    if (!process.env.SMTP_PASS) {
        console.warn(`📧 Mailer: SMTP_PASS (Brevo API key) no configurado, skip ${logLabel}.`);
        return { skipped: true };
    }

    const payload = {
        sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL },
        replyTo: { email: MAIL_REPLY_TO, name: MAIL_FROM_NAME },
        to: [{ email: to, name: name || undefined }],
        subject,
        textContent,
        htmlContent,
    };

    const doFetch = injectedFetch || fetch;
    console.log(`📧 Mailer: enviando ${logLabel} a ${to} via Brevo...`);
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

// Layout HTML compartido — header "mimo" + cuerpo + firma.
function htmlLayout({ greeting, bodyHtml, ctaHref, ctaLabel, footnote }) {
    return `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; line-height: 1.5;">
            <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px 0; color: #FF5C6C;">mimo</h1>
            <p style="margin: 16px 0;">${greeting}</p>
            ${bodyHtml}
            <p style="margin: 24px 0;">
                <a href="${ctaHref}"
                   style="display: inline-block; padding: 12px 24px; background: #FF5C6C; color: #fff; text-decoration: none; border-radius: 999px; font-weight: 600;">
                   ${ctaLabel}
                </a>
            </p>
            <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">${footnote}</p>
            <p style="margin: 32px 0 0 0; font-size: 12px; color: #9ca3af;">— El equipo de Mimo</p>
        </div>
    `;
}

export async function sendResetEmail({ to, token, name }) {
    const link = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const greeting = name ? `Hola ${name},` : 'Hola,';

    return sendBrevoEmail({
        to, name,
        logLabel: 'reset',
        subject: 'Recuperá tu contraseña — Mimo',
        textContent:
            `${greeting}\n\n` +
            `Alguien pidió restablecer la contraseña de tu cuenta en Mimo.\n\n` +
            `Abrí este link para elegir una nueva contraseña (válido por 1 hora):\n` +
            `${link}\n\n` +
            `Si no fuiste vos, ignorá este mensaje. Tu contraseña actual sigue siendo la misma.\n\n` +
            `— El equipo de Mimo`,
        htmlContent: htmlLayout({
            greeting,
            bodyHtml: `<p style="margin: 16px 0;">Alguien pidió restablecer la contraseña de tu cuenta.</p>`,
            ctaHref: link,
            ctaLabel: 'Elegir nueva contraseña',
            footnote: 'El link es válido por 1 hora. Si no fuiste vos, ignorá este mensaje — tu contraseña sigue siendo la misma.',
        }),
    });
}

// Mail de verificación de email al registrarse. El link lleva al front, que
// hace POST al endpoint de verify con el token.
export async function sendVerificationEmail({ to, token, name }) {
    const link = `${BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const greeting = name ? `Hola ${name},` : 'Hola,';

    return sendBrevoEmail({
        to, name,
        logLabel: 'verificación',
        subject: 'Verificá tu email — Mimo',
        textContent:
            `${greeting}\n\n` +
            `Bienvenido/a a Mimo. Confirmá tu email para activar tu cuenta:\n\n` +
            `${link}\n\n` +
            `Este link es válido por 48 horas. Si no te registraste en Mimo, ignorá este mensaje.\n\n` +
            `— El equipo de Mimo`,
        htmlContent: htmlLayout({
            greeting,
            bodyHtml: `<p style="margin: 16px 0;">¡Bienvenido/a a Mimo! Confirmá tu email para activar tu cuenta.</p>`,
            ctaHref: link,
            ctaLabel: 'Confirmar email',
            footnote: 'El link es válido por 48 horas. Si no te registraste, ignorá este mensaje.',
        }),
    });
}
