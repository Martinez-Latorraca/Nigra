// Envía notificaciones push vía Expo Push API + poda de tokens muertos.
// https://docs.expo.dev/push-notifications/sending-notifications/
// https://docs.expo.dev/push-notifications/sending-notifications/#push-receipts
// No usamos expo-server-sdk para evitar la dependencia: fetch directo. Alcanza
// para los volúmenes que maneja Mimo (chats + matches).
//
// Poda de tokens muertos (DeviceNotRegistered = app desinstalada o token
// invalidado). Ocurre en dos momentos:
//  1) Ticket (respuesta inmediata del send): lo podamos al toque.
//  2) Receipt (asíncrono, ~15 min después): guardamos los ids en memoria y un
//     scheduler los consulta y poda los que fallaron. Cola en memoria (sin
//     tabla nueva); si el server reinicia se pierden los pendientes, tolerable
//     igual que el scheduler de resolveReminder.
import pool from '../db.js';

const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const CHUNK_SIZE = 100; // máx mensajes/ids por request que acepta Expo.
const RECEIPT_DELAY_MS = 15 * 60 * 1000; // Expo pide esperar ~15 min.
const RECEIPT_MAX_AGE_MS = 60 * 60 * 1000; // descartar tickets sin resolver >1h.
const RECEIPT_QUEUE_CAP = 5000; // techo defensivo de la cola en memoria.

// Cola de tickets a los que todavía no les consultamos el receipt.
// Cada entrada: { id, token, at }.
const pendingReceipts = [];

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

// Nulea el push_token muerto. Nulea por valor exacto: si el user ya se
// re-registró con un token nuevo, este UPDATE no lo toca.
async function pruneToken(token, source) {
    if (!token) return;
    try {
        const { rowCount } = await pool.query(
            'UPDATE users SET push_token = NULL WHERE push_token = $1',
            [token]
        );
        if (rowCount > 0) {
            console.log(`🧹 push token muerto podado (DeviceNotRegistered, ${source})`);
        }
    } catch (e) {
        console.error('prune push token error:', e.message);
    }
}

export async function sendExpoPush(tokens, { title, body, data = {} }) {
    const list = (Array.isArray(tokens) ? tokens : [tokens])
        .filter(Boolean)
        .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (list.length === 0) return;

    for (const group of chunk(list, CHUNK_SIZE)) {
        const messages = group.map((token) => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,
            channelId: 'default',
        }));

        try {
            const res = await fetch(EXPO_SEND_URL, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(messages),
            });
            if (!res.ok) {
                console.error('Expo push HTTP', res.status, await res.text());
                continue;
            }
            const json = await res.json();
            const tickets = Array.isArray(json?.data) ? json.data : [];
            // tickets[i] corresponde a group[i] (mismo orden que mandamos).
            for (let i = 0; i < tickets.length; i++) {
                const ticket = tickets[i];
                const token = group[i];
                if (ticket?.status === 'error') {
                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        await pruneToken(token, 'ticket');
                    } else {
                        console.error('Expo push ticket error:', ticket.details?.error || ticket.message);
                    }
                } else if (ticket?.status === 'ok' && ticket.id) {
                    // Guardamos para chequear el receipt más tarde.
                    if (pendingReceipts.length < RECEIPT_QUEUE_CAP) {
                        pendingReceipts.push({ id: ticket.id, token, at: Date.now() });
                    }
                }
            }
        } catch (err) {
            console.error('sendExpoPush error:', err.message);
        }
    }
}

// Consulta los receipts de los tickets que ya "maduraron" (>15 min) y poda los
// tokens con DeviceNotRegistered. Llamado por el scheduler. Exportado para test.
export async function checkPushReceipts() {
    const now = Date.now();
    // Sacamos de la cola los que ya maduraron; los muy viejos los descartamos
    // (probablemente ya expiraron en Expo, que guarda receipts ~24h).
    const ready = [];
    for (let i = pendingReceipts.length - 1; i >= 0; i--) {
        const entry = pendingReceipts[i];
        const age = now - entry.at;
        if (age >= RECEIPT_MAX_AGE_MS) {
            pendingReceipts.splice(i, 1); // demasiado viejo, descartar.
        } else if (age >= RECEIPT_DELAY_MS) {
            ready.push(entry);
            pendingReceipts.splice(i, 1);
        }
    }
    if (ready.length === 0) return { checked: 0, pruned: 0 };

    const byId = new Map(ready.map((e) => [e.id, e.token]));
    let pruned = 0;

    for (const group of chunk(ready, CHUNK_SIZE)) {
        try {
            const res = await fetch(EXPO_RECEIPTS_URL, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: group.map((e) => e.id) }),
            });
            if (!res.ok) {
                console.error('Expo receipts HTTP', res.status, await res.text());
                continue;
            }
            const json = await res.json();
            const receipts = json?.data || {};
            for (const [id, receipt] of Object.entries(receipts)) {
                if (receipt?.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
                    await pruneToken(byId.get(id), 'receipt');
                    pruned++;
                } else if (receipt?.status === 'error') {
                    console.error('Expo push receipt error:', receipt.details?.error || receipt.message);
                }
            }
        } catch (err) {
            console.error('checkPushReceipts error:', err.message);
        }
    }
    return { checked: ready.length, pruned };
}

// Scheduler: primer chequeo a los 15 min (deja madurar los primeros tickets),
// después cada 15 min. Devuelve un stop() para tests/limpieza.
export function startReceiptScheduler() {
    const interval = setInterval(async () => {
        try { await checkPushReceipts(); } catch (e) { console.error('receipt tick error:', e?.message); }
    }, RECEIPT_DELAY_MS);
    return () => clearInterval(interval);
}

// Solo para tests: acceso a la cola interna.
export function _pendingReceiptsForTest() {
    return pendingReceipts;
}
