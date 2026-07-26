import pool from '../db.js';

const VALID_REASONS = ['spam', 'harassment', 'scam', 'inappropriate', 'other'];

// POST /api/reports — un user denuncia a otro (opcionalmente por un mensaje
// puntual) y opcionalmente lo bloquea. Trust & safety.
// Body: { reported_user_id, message_id?, pet_id?, reason, note?, block? }
export const createReport = async (req, res) => {
    try {
        const reporterId = req.user.id;
        const {
            reported_user_id, message_id, pet_id, reason, note, block,
        } = req.body || {};

        const reportedId = Number(reported_user_id);
        if (!Number.isInteger(reportedId) || reportedId <= 0) {
            return res.status(400).json({ error: 'reported_user_id inválido.' });
        }
        if (reportedId === reporterId) {
            return res.status(400).json({ error: 'No podés denunciarte a vos mismo.' });
        }
        if (!VALID_REASONS.includes(reason)) {
            return res.status(400).json({ error: `Motivo inválido. Válidos: ${VALID_REASONS.join(', ')}.` });
        }

        // Snapshot del contenido del mensaje denunciado — sobrevive si el admin
        // borra el mensaje después.
        let messageId = message_id != null ? Number(message_id) : null;
        let snapshot = null;
        if (Number.isInteger(messageId) && messageId > 0) {
            const { rows } = await pool.query(
                'SELECT content, sender_id FROM messages WHERE id = $1',
                [messageId]
            );
            // Solo aceptamos el message_id si el mensaje existe y lo mandó el
            // denunciado (evita reportar mensajes ajenos por id arbitrario).
            if (rows.length > 0 && Number(rows[0].sender_id) === reportedId) {
                snapshot = rows[0].content;
            } else {
                messageId = null; // id inválido o no corresponde al denunciado
            }
        } else {
            messageId = null;
        }

        const { rows } = await pool.query(
            `INSERT INTO reports (reporter_id, reported_user_id, message_id, pet_id, message_snapshot, reason, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, status, created_at`,
            [
                reporterId, reportedId, messageId,
                pet_id != null ? Number(pet_id) : null,
                snapshot,
                reason,
                typeof note === 'string' ? note.trim().slice(0, 1000) : null,
            ]
        );

        // Bloqueo opcional (idempotente vía ON CONFLICT).
        if (block) {
            await pool.query(
                `INSERT INTO user_blocks (blocker_id, blocked_id)
                 VALUES ($1, $2)
                 ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
                [reporterId, reportedId]
            );
        }

        res.status(201).json({ id: rows[0].id, blocked: !!block });
    } catch (error) {
        console.error('createReport error:', error);
        res.status(500).json({ error: 'No se pudo enviar la denuncia.' });
    }
};

// GET /api/reports/blocks — lista de ids que el user bloqueó (para el cliente).
export const listMyBlocks = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT blocked_id FROM user_blocks WHERE blocker_id = $1',
            [req.user.id]
        );
        res.json({ blocked_ids: rows.map((r) => r.blocked_id) });
    } catch (error) {
        console.error('listMyBlocks error:', error);
        res.status(500).json({ error: 'Error obteniendo bloqueos.' });
    }
};

// POST /api/reports/blocks — bloquear sin denunciar (idempotente).
export const blockUser = async (req, res) => {
    try {
        const blockedId = Number(req.body?.user_id);
        if (!Number.isInteger(blockedId) || blockedId <= 0 || blockedId === req.user.id) {
            return res.status(400).json({ error: 'user_id inválido.' });
        }
        await pool.query(
            `INSERT INTO user_blocks (blocker_id, blocked_id)
             VALUES ($1, $2) ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
            [req.user.id, blockedId]
        );
        res.status(204).end();
    } catch (error) {
        console.error('blockUser error:', error);
        res.status(500).json({ error: 'No se pudo bloquear.' });
    }
};

// DELETE /api/reports/blocks/:userId — desbloquear.
export const unblockUser = async (req, res) => {
    try {
        const blockedId = Number(req.params.userId);
        if (!Number.isInteger(blockedId) || blockedId <= 0) {
            return res.status(400).json({ error: 'userId inválido.' });
        }
        await pool.query(
            'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [req.user.id, blockedId]
        );
        res.status(204).end();
    } catch (error) {
        console.error('unblockUser error:', error);
        res.status(500).json({ error: 'No se pudo desbloquear.' });
    }
};

// GET /api/admin/reports — cola de denuncias para el admin.
export const adminListReports = async (req, res) => {
    try {
        const status = req.query.status; // opcional: pending | reviewed | dismissed
        const params = [];
        let where = '';
        if (status && ['pending', 'reviewed', 'dismissed'].includes(status)) {
            params.push(status);
            where = `WHERE r.status = $${params.length}`;
        }
        const { rows } = await pool.query(
            `SELECT r.id, r.reason, r.note, r.status, r.created_at,
                    r.message_id, r.message_snapshot, r.pet_id,
                    r.reporter_id, ru.name AS reporter_name, ru.email AS reporter_email,
                    r.reported_user_id, du.name AS reported_name, du.email AS reported_email,
                    du.deleted_at AS reported_deleted_at
             FROM reports r
             JOIN users ru ON ru.id = r.reporter_id
             JOIN users du ON du.id = r.reported_user_id
             ${where}
             ORDER BY r.created_at DESC
             LIMIT 200`,
            params
        );
        res.json({ reports: rows });
    } catch (error) {
        console.error('adminListReports error:', error);
        res.status(500).json({ error: 'Error listando denuncias.' });
    }
};

// PATCH /api/admin/reports/:id — cambiar estado (reviewed | dismissed | pending).
export const adminUpdateReportStatus = async (req, res) => {
    try {
        const status = req.body?.status;
        if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: 'status inválido.' });
        }
        const { rows } = await pool.query(
            'UPDATE reports SET status = $1 WHERE id = $2 RETURNING id, status',
            [status, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Denuncia no encontrada.' });
        res.json(rows[0]);
    } catch (error) {
        console.error('adminUpdateReportStatus error:', error);
        res.status(500).json({ error: 'No se pudo actualizar la denuncia.' });
    }
};
