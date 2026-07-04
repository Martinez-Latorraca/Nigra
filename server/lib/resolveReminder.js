// Job en memoria que le recuerda al dueño de una mascota que cerró el caso.
// Corre cada 10 min: busca reportes sin resolver donde hubo chat en las
// últimas 72h pero nada en los últimos 60 min → asume que el usuario se
// olvidó de marcar el reencuentro. Manda una notificación de inbox +
// push si tiene push_token. Idempotente: chequea que no exista ya una
// notificación de este tipo para este pet.

const REMINDER_INTERVAL_MS = 10 * 60 * 1000; // 10 min

export function buildReminderQuery() {
    // Devuelve SQL + no toma parámetros para simplificar tests.
    return `
        SELECT p.id AS pet_id, p.name AS pet_name, p.user_id AS owner_id,
               u.push_token, u.name AS owner_name
        FROM pets p
        JOIN users u ON u.id = p.user_id
        WHERE p.resolved_at IS NULL
          AND EXISTS (
              SELECT 1 FROM messages m
              WHERE m.pet_id = p.id
                AND m.created_at > NOW() - INTERVAL '72 hours'
          )
          AND NOT EXISTS (
              SELECT 1 FROM messages m
              WHERE m.pet_id = p.id
                AND m.created_at > NOW() - INTERVAL '60 minutes'
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = p.user_id
                AND n.type = 'resolve_reminder'
                AND (n.data->>'pet_id')::int = p.id
          )
    `;
}

export async function runReminderTick({ pool, io, sendExpoPush }) {
    const { rows } = await pool.query(buildReminderQuery());
    for (const row of rows) {
        const petLabel = row.pet_name ? ` a ${row.pet_name}` : '';
        const notificationData = {
            pet_id: row.pet_id,
            pet_name: row.pet_name,
        };

        // 1. Guardar notification en inbox.
        const notif = await pool.query(
            `INSERT INTO notifications (user_id, type, data)
             VALUES ($1, 'resolve_reminder', $2::jsonb)
             RETURNING id, type, data, read_at, created_at`,
            [row.owner_id, JSON.stringify(notificationData)]
        );

        // 2. Emit via socket (aparece en la lista inmediatamente en clientes conectados).
        if (io) {
            io.to(`user_${row.owner_id}`).emit('new_match_notification', notif.rows[0]);
        }

        // 3. Push (fire-and-forget).
        if (row.push_token) {
            try {
                sendExpoPush(row.push_token, {
                    title: '¿Ya te reencontraste?',
                    body: `Marcá${petLabel} como reunida desde el chat para cerrar el caso 🎉`,
                    data: {
                        type: 'resolve_reminder',
                        pet_id: row.pet_id,
                        receiver_id: row.owner_id,
                    },
                });
            } catch (e) {
                console.error('resolve_reminder push error:', e?.message);
            }
        }
    }
    return { count: rows.length };
}

export function startReminderScheduler(deps) {
    // Primer tick a los 30s del arranque (deja que la DB esté lista), después
    // cada 10 min.
    const initial = setTimeout(async () => {
        try { await runReminderTick(deps); } catch (e) { console.error('reminder tick error:', e?.message); }
    }, 30 * 1000);

    const interval = setInterval(async () => {
        try { await runReminderTick(deps); } catch (e) { console.error('reminder tick error:', e?.message); }
    }, REMINDER_INTERVAL_MS);

    return () => { clearTimeout(initial); clearInterval(interval); };
}
