import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSendPetMessage, handleJoinPetChat } from '../lib/socketHandlers.js';

// Fábrica de un socket mockeado: capturamos las llamadas a emit + join.
const makeSocket = (userId = 7) => {
    const emit = vi.fn();
    const join = vi.fn();
    return { userId, emit, join };
};

const makeIo = () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    return { to, _emit: emit };
};

describe('Socket handlers', () => {
    describe('handleJoinPetChat', () => {
        it('une al socket a la sala pet_chat_{pet_id}', () => {
            const socket = makeSocket();
            const result = handleJoinPetChat({ socket, data: { pet_id: 42 } });
            expect(result.ok).toBe(true);
            expect(socket.join).toHaveBeenCalledWith('pet_chat_42');
        });

        it('no hace nada si falta pet_id', () => {
            const socket = makeSocket();
            const result = handleJoinPetChat({ socket, data: {} });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('missing_pet_id');
            expect(socket.join).not.toHaveBeenCalled();
        });
    });

    describe('handleSendPetMessage', () => {
        let pool, io, sendExpoPush, socket;

        beforeEach(() => {
            pool = { query: vi.fn() };
            io = makeIo();
            sendExpoPush = vi.fn();
            socket = makeSocket(7);
        });

        it('rechaza si falta pet_id / receiver_id / content', async () => {
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: '' },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('missing_data');
            expect(socket.emit).toHaveBeenCalledWith('error_notification', expect.any(String));
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('rechaza content solo con whitespace', async () => {
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: '   ' },
            });
            expect(result.ok).toBe(false);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('happy path: guarda mensaje, notifica al receptor y al emisor, dispara new_notification y push', async () => {
            const savedMessage = {
                id: 99, pet_id: 1, sender_id: 7, receiver_id: 2, content: 'hola',
                created_at: new Date().toISOString(),
            };
            pool.query
                .mockResolvedValueOnce({ rows: [savedMessage] })            // INSERT
                .mockResolvedValueOnce({ rows: [{ push_token: 'ExponentPushToken[xxx]' }] }); // SELECT push_token

            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: {
                    pet_id: 1,
                    receiver_id: 2,
                    content: 'hola',
                    petPhoto: 'https://x.com/p.jpg',
                    senderName: 'Ana',
                },
            });

            expect(result.ok).toBe(true);
            expect(result.message.id).toBe(99);

            // El sender_id es el del socket (no del payload) — importante para seguridad
            expect(pool.query.mock.calls[0][1]).toEqual([1, 7, 2, 'hola']);

            // Emite el receive_pet_message a la sala del receptor
            expect(io.to).toHaveBeenCalledWith('user_2');
            expect(io._emit).toHaveBeenCalledWith('receive_pet_message', savedMessage);
            expect(io._emit).toHaveBeenCalledWith('new_notification', expect.objectContaining({
                pet_id: 1,
                sender_id: 7,
                senderName: 'Ana',
                petPhoto: 'https://x.com/p.jpg',
                content: 'hola',
            }));

            // Emite también al emisor (para sus otras pestañas)
            expect(socket.emit).toHaveBeenCalledWith('receive_pet_message', savedMessage);

            // El push se dispara fire-and-forget: esperamos un microtask para que resuelva
            await new Promise((r) => setImmediate(r));
            expect(sendExpoPush).toHaveBeenCalledWith('ExponentPushToken[xxx]', expect.objectContaining({
                title: 'Ana',
                body: 'hola',
                data: expect.objectContaining({
                    type: 'message',
                    pet_id: 1,
                    otherUserId: 7,
                    receiver_id: 2,
                }),
            }));
        });

        it('no envía push si el receptor no tiene push_token', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 100 }] })
                .mockResolvedValueOnce({ rows: [{ push_token: null }] });

            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });

            await new Promise((r) => setImmediate(r));
            expect(sendExpoPush).not.toHaveBeenCalled();
        });

        it('trunca el body del push si el mensaje es muy largo (>120 chars)', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 101 }] })
                .mockResolvedValueOnce({ rows: [{ push_token: 'T' }] });

            const longContent = 'a'.repeat(200);
            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: longContent, senderName: 'X' },
            });

            await new Promise((r) => setImmediate(r));
            const [, notif] = sendExpoPush.mock.calls[0];
            expect(notif.body.length).toBe(118); // 117 + '…'
            expect(notif.body.endsWith('…')).toBe(true);
        });

        it('emite error_notification y devuelve db_error si falla el INSERT', async () => {
            pool.query.mockRejectedValueOnce(new Error('db down'));

            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });

            expect(result.ok).toBe(false);
            expect(result.reason).toBe('db_error');
            expect(socket.emit).toHaveBeenCalledWith('error_notification', expect.any(String));
            expect(io.to).not.toHaveBeenCalled();
        });
    });
});
