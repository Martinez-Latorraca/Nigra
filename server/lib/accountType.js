// Vincular un usuario a una entidad (veterinaria o refugio).
//
// Hay dos caminos que necesitan esto y no queremos que diverjan:
//   1. El admin convirtiendo a alguien   (adminController.setUserAccountType)
//   2. El propio usuario declarándose    (authController.setMyAccountType),
//      justo después de su primer login social — el único momento donde el
//      OAuth no pudo preguntar el tipo de cuenta.
//
// En ambos la entidad se crea SIN aprobar: declarar y aprobar son dos pasos
// distintos, así la verificación (papeles del refugio, datos de la vet) sigue
// pasando por el admin como siempre.
import pool from '../db.js';
import { slugify, ensureUniqueSlug } from '../utils/slug.js';

// Allowlist: el nombre de tabla se interpola en el SQL (no se puede
// parametrizar), así que NUNCA debe venir directo del input.
export const ENTITY_TABLES = { vet: 'vets', shelter: 'shelters' };

export const isValidAccountType = (t) => Object.hasOwn(ENTITY_TABLES, t);

// Devuelve un resultado discriminado para que cada caller elija su status HTTP.
//   { status: 'created' | 'restored', entity }
//   { status: 'exists', entity }        -> ya tiene una activa
//   { status: 'user_not_found' }
//   { status: 'user_deleted' }
export async function linkUserToEntity({ userId, accountType }) {
    const table = ENTITY_TABLES[accountType];
    if (!table) throw new Error(`account_type inválido: ${accountType}`);

    const { rows: userRows } = await pool.query(
        'SELECT id, name, email, deleted_at FROM users WHERE id = $1',
        [userId]
    );
    if (userRows.length === 0) return { status: 'user_not_found' };
    const user = userRows[0];
    if (user.deleted_at) return { status: 'user_deleted' };

    // Índice único por owner_user_id: un usuario no puede tener dos. Si quedó
    // una fila soft-borrada de antes, hay que reactivarla — insertar chocaría
    // contra el índice y saldría un 500 en vez de un mensaje útil.
    const { rows: existing } = await pool.query(
        `SELECT id, slug, approved, deleted_at FROM ${table} WHERE owner_user_id = $1`,
        [userId]
    );
    if (existing.length > 0) {
        const row = existing[0];
        if (!row.deleted_at) return { status: 'exists', entity: row };

        const { rows: restored } = await pool.query(
            `UPDATE ${table} SET deleted_at = NULL WHERE id = $1
             RETURNING id, slug, name, approved`,
            [row.id]
        );
        return { status: 'restored', entity: restored[0] };
    }

    const slug = await ensureUniqueSlug(pool, table, slugify(user.name));
    const { rows: created } = await pool.query(
        `INSERT INTO ${table} (slug, name, owner_user_id, email, approved)
         VALUES ($1, $2, $3, $4, FALSE)
         RETURNING id, slug, name, approved`,
        [slug, user.name, userId, user.email]
    );
    return { status: 'created', entity: created[0] };
}

// Mensaje al usuario cuando ya tiene la entidad.
export const alreadyHasMessage = (accountType) =>
    accountType === 'vet'
        ? 'Este usuario ya tiene una veterinaria.'
        : 'Este usuario ya tiene un refugio.';
