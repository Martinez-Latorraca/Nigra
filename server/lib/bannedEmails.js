// Bloqueo de emails por moderación.
//
// Por qué existe: marcar `users.deleted_at` NO expulsa a nadie. El registro
// reactiva una cuenta soft-borrada con el mismo email (es una feature: permite
// volver si te arrepentiste de borrarte), así que un usuario expulsado volvía
// con sus mascotas y chats intactos. Y si no chequeáramos el login social,
// entraría con Google sin pasar por el registro.
//
// Por eso el bloqueo se consulta en LOS TRES caminos de alta:
//   1. POST /api/auth/register  — antes de la rama que restaura
//   2. login social (findOrCreateOAuthUser)
//   3. el propio login (ya bloqueado por deleted_at, pero por si acaso)
import pool from '../db.js';

// Comparamos siempre en minúsculas: si no, se esquiva el bloqueo cambiando
// una mayúscula. El índice único también es sobre LOWER(email).
export async function isEmailBanned(email) {
    if (!email) return false;
    try {
        const { rows } = await pool.query(
            'SELECT 1 FROM banned_emails WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [email]
        );
        return rows.length > 0;
    } catch (e) {
        // Si la tabla todavía no existe (deploy a medias), no bloqueamos el
        // registro de todo el mundo: fallamos "abierto" y lo dejamos en el log.
        console.error('isEmailBanned error:', e.message);
        return false;
    }
}

// Mensaje único para los tres caminos. Deliberadamente no dice "estás
// baneado": no le damos al expulsado información para evadir el bloqueo, y
// evitamos confirmarle a un tercero que ese email tuvo una cuenta.
export const BANNED_MESSAGE = 'No se puede crear una cuenta con este email. Si creés que es un error, escribinos.';

// Registra el bloqueo. Idempotente: si el email ya estaba, no falla.
export async function banEmail({ email, userId = null, reportId = null, reason = null, bannedBy }) {
    if (!email) return null;
    const { rows } = await pool.query(
        `INSERT INTO banned_emails (email, user_id, report_id, reason, banned_by)
         VALUES (LOWER($1), $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE
           SET reason = COALESCE(EXCLUDED.reason, banned_emails.reason)
         RETURNING id, email, created_at`,
        [email, userId, reportId, reason, bannedBy]
    );
    return rows[0] || null;
}
