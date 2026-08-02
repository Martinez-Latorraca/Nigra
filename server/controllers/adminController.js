import pool from '../db.js';
import { generateEmbedding } from '../ai.js';
import { slugify, ensureUniqueSlug } from '../utils/slug.js';
import logger from '../lib/logger.js';

// ─── MATCH / REUNION STATS ──────────────────────────────────
// Dos métricas distintas:
//   1. Reencuentros TOTALES del producto — todo caso cerrado (resolved_at),
//      venga de un match del AI o de que alguien lo vio navegando el feed.
//   2. Calidad del MATCHING — solo el subset que vino de un match del AI
//      (match_events): de los generados, cuántos terminaron en reencuentro
//      (reunited) vs falso positivo (rejected). visual_distance = señal ML.
export const getMatchStats = async (_req, res) => {
    try {
        const [reunionsTotal, reunions30d, byOutcome, avgDist] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS n FROM pets WHERE resolved_at IS NOT NULL'),
            pool.query(`SELECT COUNT(*)::int AS n FROM pets WHERE resolved_at >= NOW() - INTERVAL '30 days'`),
            pool.query('SELECT outcome, COUNT(*)::int AS n FROM match_events GROUP BY outcome'),
            pool.query('SELECT ROUND(AVG(visual_distance)::numeric, 3) AS d FROM match_events'),
        ]);

        const outcomes = { pending: 0, reunited: 0, rejected: 0 };
        for (const r of byOutcome.rows) outcomes[r.outcome] = r.n;
        const generated = outcomes.pending + outcomes.reunited + outcomes.rejected;
        const judged = outcomes.reunited + outcomes.rejected;
        // Precisión: de los matches con veredicto, cuántos fueron reencuentros.
        const precision = judged > 0 ? Math.round((outcomes.reunited / judged) * 100) : null;

        res.json({
            reunions_total: reunionsTotal.rows[0].n,
            reunions_30d: reunions30d.rows[0].n,
            matches_generated: generated,
            matches_reunited: outcomes.reunited,
            matches_rejected: outcomes.rejected,
            matches_pending: outcomes.pending,
            avg_distance: avgDist.rows[0].d != null ? Number(avgDist.rows[0].d) : null,
            precision_pct: precision,
        });
    } catch (error) {
        console.error('getMatchStats error:', error);
        res.status(500).json({ error: 'Error obteniendo stats de matching.' });
    }
};

// ─── DASHBOARD STATS ────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    try {
        const [
            usersCount, petsCount, messagesCount, petsLost, petsFound,
            sheltersActive, sheltersPending,
            adoptionsActive, adoptionsAdopted,
            adoptionsBySpecies, avgDaysToAdopt,
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM pets'),
            pool.query('SELECT COUNT(*) FROM messages'),
            pool.query("SELECT COUNT(*) FROM pets WHERE status = 'lost'"),
            pool.query("SELECT COUNT(*) FROM pets WHERE status = 'found'"),
            pool.query('SELECT COUNT(*) FROM shelters WHERE approved = TRUE AND deleted_at IS NULL'),
            pool.query('SELECT COUNT(*) FROM shelters WHERE approved = FALSE AND deleted_at IS NULL'),
            pool.query('SELECT COUNT(*) FROM adoption_pets WHERE adopted_at IS NULL AND deleted_at IS NULL'),
            pool.query('SELECT COUNT(*) FROM adoption_pets WHERE adopted_at IS NOT NULL'),
            pool.query(
                `SELECT species, COUNT(*)::int AS n
                 FROM adoption_pets
                 WHERE adopted_at IS NULL AND deleted_at IS NULL
                 GROUP BY species`
            ),
            // Promedio en días de created_at → adopted_at. NULL si aún no hay adopciones.
            pool.query(
                `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (adopted_at - created_at)) / 86400))::int AS days
                 FROM adoption_pets
                 WHERE adopted_at IS NOT NULL`
            ),
        ]);

        const recentPets = await pool.query(
            `SELECT p.id, p.name, p.status, p.type, p.color, p.photo_url, p.created_at,
                    u.name AS reporter_name, u.email AS reporter_email
             FROM pets p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC LIMIT 5`
        );

        const recentUsers = await pool.query(
            `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`
        );

        // Top 5 refugios por cantidad de adopciones concretadas.
        const topShelters = await pool.query(
            `SELECT s.id, s.slug, s.name, s.city, s.logo_url,
                    COUNT(ap.id) FILTER (WHERE ap.adopted_at IS NOT NULL)::int AS adopted_count,
                    COUNT(ap.id) FILTER (WHERE ap.adopted_at IS NULL AND ap.deleted_at IS NULL)::int AS active_count
             FROM shelters s
             LEFT JOIN adoption_pets ap ON ap.shelter_id = s.id
             WHERE s.approved = TRUE AND s.deleted_at IS NULL
             GROUP BY s.id
             ORDER BY adopted_count DESC, active_count DESC
             LIMIT 5`
        );

        // Últimas 5 adopciones activas (para preview).
        const recentAdoptions = await pool.query(
            `SELECT ap.id, ap.name, ap.species, ap.photos, ap.created_at,
                    s.name AS shelter_name, s.slug AS shelter_slug
             FROM adoption_pets ap
             JOIN shelters s ON s.id = ap.shelter_id
             WHERE ap.deleted_at IS NULL AND ap.adopted_at IS NULL
               AND s.approved = TRUE AND s.deleted_at IS NULL
             ORDER BY ap.created_at DESC LIMIT 5`
        );

        // adoptionsBySpecies pivot a objeto {dog, cat, other} para el frontend.
        const speciesMap = { dog: 0, cat: 0, other: 0 };
        for (const r of adoptionsBySpecies.rows) speciesMap[r.species] = r.n;

        res.json({
            totalUsers: parseInt(usersCount.rows[0].count),
            totalPets: parseInt(petsCount.rows[0].count),
            totalMessages: parseInt(messagesCount.rows[0].count),
            totalLost: parseInt(petsLost.rows[0].count),
            totalFound: parseInt(petsFound.rows[0].count),
            // Refugios & adopciones — solo visible al admin. Los shelters NO
            // ven sus propias métricas (decisión: no aporta valor al refugio,
            // sí al operador).
            totalShelters: parseInt(sheltersActive.rows[0].count),
            pendingShelters: parseInt(sheltersPending.rows[0].count),
            totalAdoptionsActive: parseInt(adoptionsActive.rows[0].count),
            totalAdopted: parseInt(adoptionsAdopted.rows[0].count),
            adoptionsBySpecies: speciesMap,
            avgDaysToAdopt: avgDaysToAdopt.rows[0]?.days ?? null,
            topShelters: topShelters.rows,
            recentAdoptions: recentAdoptions.rows,
            recentPets: recentPets.rows,
            recentUsers: recentUsers.rows,
        });
    } catch (error) {
        console.error('Error en dashboard stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
};

// ─── USERS MANAGEMENT ───────────────────────────────────────
export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let whereClause = '';
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause = `WHERE u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex}`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM users u ${whereClause}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        // JOIN a vets/shelters para que el panel sepa quién ya es una entidad
        // (y no ofrezca convertir a alguien que ya lo es). Ignoramos las
        // soft-borradas: para esas la conversión reactiva en vez de crear.
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.created_at,
                    v.id AS vet_id, v.approved AS vet_approved,
                    s.id AS shelter_id, s.approved AS shelter_approved
             FROM users u
             LEFT JOIN vets v ON v.owner_user_id = u.id AND v.deleted_at IS NULL
             LEFT JOIN shelters s ON s.owner_user_id = u.id AND s.deleted_at IS NULL
             ${whereClause}
             ORDER BY u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        res.json({
            users: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
};

// Convierte un usuario existente en veterinaria o refugio.
//
// Por qué existe: en el registro con email se elige account_type y se crea la
// fila de vets/shelters, pero al entrar con Google/Facebook/Apple ese dato no
// existe — el proveedor solo devuelve nombre y mail. El usuario quedaba como
// particular sin forma de convertirse, y no hay UI de autogestión. Esto le da
// al admin la salida manual.
//
// Se crea con approved = FALSE a propósito: convertir y aprobar siguen siendo
// dos pasos, así la verificación (papeles del refugio, datos de la vet) pasa
// por el mismo flujo de siempre en vez de saltearse.
const ENTITY_TABLES = { vet: 'vets', shelter: 'shelters' };

export const setUserAccountType = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { account_type } = req.body || {};
        const table = ENTITY_TABLES[account_type];
        if (!table) {
            return res.status(400).json({ error: "account_type debe ser 'vet' o 'shelter'." });
        }

        const { rows: userRows } = await pool.query(
            'SELECT id, name, email, deleted_at FROM users WHERE id = $1',
            [userId]
        );
        if (userRows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const user = userRows[0];
        if (user.deleted_at) {
            return res.status(400).json({ error: 'La cuenta está eliminada.' });
        }

        // Hay índice único por owner_user_id, así que un usuario no puede tener
        // dos. Si ya existe una fila con soft-delete, la reactivamos en vez de
        // intentar insertar (chocaría con el índice).
        const { rows: existing } = await pool.query(
            `SELECT id, slug, approved, deleted_at FROM ${table} WHERE owner_user_id = $1`,
            [userId]
        );
        if (existing.length > 0) {
            const row = existing[0];
            if (!row.deleted_at) {
                return res.status(409).json({
                    error: account_type === 'vet'
                        ? 'Este usuario ya tiene una veterinaria.'
                        : 'Este usuario ya tiene un refugio.',
                    id: row.id, approved: row.approved,
                });
            }
            const { rows: restored } = await pool.query(
                `UPDATE ${table} SET deleted_at = NULL WHERE id = $1
                 RETURNING id, slug, name, approved`,
                [row.id]
            );
            logger.info({ adminId: req.user.id, userId, account_type, action: 'restored' }, 'admin cambió el tipo de cuenta');
            return res.json({ message: 'Reactivado', account_type, entity: restored[0], restored: true });
        }

        const slug = await ensureUniqueSlug(pool, table, slugify(user.name));
        const { rows: created } = await pool.query(
            `INSERT INTO ${table} (slug, name, owner_user_id, email, approved)
             VALUES ($1, $2, $3, $4, FALSE)
             RETURNING id, slug, name, approved`,
            [slug, user.name, userId, user.email]
        );

        // Acción privilegiada: dejamos rastro de quién la hizo.
        logger.info({ adminId: req.user.id, userId, account_type, action: 'created' }, 'admin cambió el tipo de cuenta');

        res.status(201).json({
            message: account_type === 'vet' ? 'Convertido en veterinaria' : 'Convertido en refugio',
            account_type,
            entity: created[0],
        });
    } catch (error) {
        logger.error({ err: error }, 'setUserAccountType error');
        res.status(500).json({ error: 'No se pudo cambiar el tipo de cuenta.' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: 'No podés eliminarte a vos mismo' });
        }

        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (userCheck.rows[0].role === 'admin') {
            return res.status(400).json({ error: 'No podés eliminar a otro administrador' });
        }

        await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
        await pool.query('DELETE FROM pets WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'Usuario eliminado con éxito' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
        }

        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Rol actualizado', user: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando rol:', error);
        res.status(500).json({ error: 'Error actualizando rol' });
    }
};

// ─── PETS MANAGEMENT ────────────────────────────────────────
export const adminGetAllPets = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const { status, type, search } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            conditions.push(`p.status = $${paramIndex++}`);
            params.push(status);
        }
        if (type && type !== 'all') {
            conditions.push(`p.type = $${paramIndex++}`);
            params.push(type);
        }
        if (search) {
            conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM pets p JOIN users u ON p.user_id = u.id ${whereClause}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT p.id, p.name, p.description, p.status, p.type, p.color, p.photo_url,
                    p.lat, p.lng, p.created_at, p.contact_info,
                    u.name AS reporter_name, u.email AS reporter_email, u.id AS user_id
             FROM pets p
             JOIN users u ON p.user_id = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        res.json({
            pets: result.rows,
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (error) {
        console.error('Error obteniendo mascotas (admin):', error);
        res.status(500).json({ error: 'Error obteniendo mascotas' });
    }
};

export const adminDeletePet = async (req, res) => {
    try {
        const petId = req.params.id;

        await pool.query('DELETE FROM messages WHERE pet_id = $1', [petId]);
        const result = await pool.query('DELETE FROM pets WHERE id = $1 RETURNING *', [petId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        res.json({ message: 'Reporte eliminado con éxito' });
    } catch (error) {
        console.error('Error eliminando reporte (admin):', error);
        res.status(500).json({ error: 'Error eliminando reporte' });
    }
};

// ─── MESSAGES MANAGEMENT ────────────────────────────────────
// El browse-all de conversaciones (adminGetConversations) se removió por
// privacidad: leer todos los DMs sin causa era vigilancia general. La
// moderación ahora accede a un hilo puntual solo desde una denuncia
// (adminGetConversationMessages), scopeado a pet + los dos users.
export const adminGetConversationMessages = async (req, res) => {
    try {
        const { pet_id, user_a, user_b } = req.params;

        const result = await pool.query(
            `SELECT m.id, m.content, m.created_at, m.is_read,
                    m.sender_id, us.name AS sender_name,
                    m.receiver_id, ur.name AS receiver_name
             FROM messages m
             JOIN users us ON m.sender_id = us.id
             JOIN users ur ON m.receiver_id = ur.id
             WHERE m.pet_id = $1
               AND LEAST(m.sender_id, m.receiver_id) = $2
               AND GREATEST(m.sender_id, m.receiver_id) = $3
             ORDER BY m.created_at ASC`,
            [pet_id, Math.min(user_a, user_b), Math.max(user_a, user_b)]
        );

        res.json({ messages: result.rows });
    } catch (error) {
        console.error('Error obteniendo mensajes de conversación:', error);
        res.status(500).json({ error: 'Error obteniendo mensajes' });
    }
};

export const adminDeleteMessage = async (req, res) => {
    try {
        const messageId = req.params.id;

        const result = await pool.query('DELETE FROM messages WHERE id = $1 RETURNING *', [messageId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        res.json({ message: 'Mensaje eliminado con éxito' });
    } catch (error) {
        console.error('Error eliminando mensaje (admin):', error);
        res.status(500).json({ error: 'Error eliminando mensaje' });
    }
};

// ─── BACKFILL DE EMBEDDINGS ─────────────────────────────────
// Re-genera los embeddings de todas las mascotas con el pipeline actual.
// Se usa después de cambiar el pipeline de inferencia (ej. tfjs puro → tfjs-node)
// porque los vectores quedan en espacios numéricos distintos y las distancias
// pgvector se descalibran. Es idempotente: se puede correr cuantas veces se quiera.
export const backfillEmbeddings = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, photo_url FROM pets WHERE photo_url IS NOT NULL ORDER BY id'
        );
        console.log(`[Backfill] arrancando, ${rows.length} mascotas`);

        let done = 0;
        let failed = 0;
        const errors = [];

        for (const pet of rows) {
            try {
                const response = await fetch(pet.photo_url);
                if (!response.ok) throw new Error(`HTTP ${response.status} bajando ${pet.photo_url}`);
                const buffer = Buffer.from(await response.arrayBuffer());
                const vector = await generateEmbedding(buffer);
                await pool.query('UPDATE pets SET embedding = $1 WHERE id = $2', [
                    JSON.stringify(vector),
                    pet.id,
                ]);
                done++;
                console.log(`[Backfill] pet ${pet.id} OK (${done}/${rows.length})`);
            } catch (err) {
                failed++;
                errors.push({ id: pet.id, error: err.message });
                console.error(`[Backfill] pet ${pet.id} FALLO:`, err.message);
            }
        }

        console.log(`[Backfill] terminado: ${done} OK, ${failed} fallaron`);
        res.json({ total: rows.length, done, failed, errors });
    } catch (error) {
        console.error('Error en backfill de embeddings:', error);
        res.status(500).json({ error: 'Error en backfill' });
    }
};

// GET /api/admin/deleted-user-matches — inbox admin de matches donde el
// dueño del pet original tiene deleted_at. Filtra las notifs
// `admin_deleted_user_match` del admin logueado. Ver
// [[project-admin-alert-deleted-user-match]].
export const listDeletedUserMatches = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, data, read_at, created_at
             FROM notifications
             WHERE user_id = $1 AND type = 'admin_deleted_user_match'
             ORDER BY created_at DESC
             LIMIT 100`,
            [req.user.id]
        );
        res.json({ items: rows });
    } catch (error) {
        console.error('listDeletedUserMatches error:', error);
        res.status(500).json({ error: 'Error listando alertas.' });
    }
};

// PATCH /api/admin/deleted-user-matches/:id/read — marca una notif como leída.
export const markDeletedUserMatchRead = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE notifications SET read_at = NOW()
             WHERE id = $1 AND user_id = $2 AND type = 'admin_deleted_user_match'
             RETURNING id, read_at`,
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'No encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('markDeletedUserMatchRead error:', error);
        res.status(500).json({ error: 'Error marcando como leída.' });
    }
};
