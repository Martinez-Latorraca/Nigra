// Envío de emails transaccionales via Gmail SMTP + nodemailer.
//
// Env vars requeridas en producción:
//   SMTP_USER — cuenta de Gmail (ej: somos.mimo.app@gmail.com)
//   SMTP_PASS — App Password (16 chars) generado en Google Account con 2FA.
// BASE_URL se usa para armar el link de reset. Fallback: https://nigra-server.onrender.com.
//
// En test/dev sin SMTP configurado, sendResetEmail devuelve { skipped: true }
// sin tirar error, para que los tests no dependan de red.

import nodemailer from 'nodemailer';

const BASE_URL = process.env.BASE_URL || 'https://nigra-server.onrender.com';
const FROM = 'Mimo <somos.mimo.app@gmail.com>';

let cachedTransporter = null;

function getTransporter() {
    if (cachedTransporter) return cachedTransporter;
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
    cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return cachedTransporter;
}

// Sólo para tests: permite inyectar un transporter fake y evitar la red.
export function _setTransporterForTest(fake) {
    cachedTransporter = fake;
}

export async function sendResetEmail({ to, token, name }) {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn('Mailer: SMTP_USER/SMTP_PASS no configurados, skip envío.');
        return { skipped: true };
    }

    const link = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const greeting = name ? `Hola ${name},` : 'Hola,';

    const info = await transporter.sendMail({
        from: FROM,
        to,
        subject: 'Recuperá tu contraseña — Mimo',
        text:
            `${greeting}\n\n` +
            `Alguien pidió restablecer la contraseña de tu cuenta en Mimo.\n\n` +
            `Abrí este link para elegir una nueva contraseña (válido por 1 hora):\n` +
            `${link}\n\n` +
            `Si no fuiste vos, ignorá este mensaje. Tu contraseña actual sigue siendo la misma.\n\n` +
            `— El equipo de Mimo`,
        html: `
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
    });

    return { skipped: false, messageId: info.messageId };
}
