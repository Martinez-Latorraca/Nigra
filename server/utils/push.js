// Envía notificaciones push vía Expo Push API.
// https://docs.expo.dev/push-notifications/sending-notifications/
// No usamos expo-server-sdk para evitar agregar una dependencia: hacemos
// fetch directo. Funciona para los volúmenes que maneja Nigra (chats + matches).

export async function sendExpoPush(tokens, { title, body, data = {} }) {
    const list = (Array.isArray(tokens) ? tokens : [tokens])
        .filter(Boolean)
        .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (list.length === 0) return;

    const messages = list.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        channelId: 'default',
    }));

    try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });
        if (!res.ok) {
            console.error('Expo push HTTP', res.status, await res.text());
        }
    } catch (err) {
        console.error('sendExpoPush error:', err.message);
    }
}
