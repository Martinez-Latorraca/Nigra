import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    handleSendPetMessage,
    handleJoinPetChat,
    validateMessagePayload,
    MAX_CONTENT_LENGTH,
} from '../lib/socketHandlers.js';

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

// Mock pool que sale de la query correcta según el orden esperado:
// 1) SELECT user_id FROM pets (relación)
// 2) SELECT name FROM users (senderProfile)
// 3) SELECT v.name FROM pets JOIN vets (resolveSenderDisplayName — vet override)
// 4) INSERT INTO messages (save)
// 5) SELECT push_token (push lookup, fire-and-forget)
const mockHappyPath = (pool, {
    ownerId = 7,
    senderName = 'Ana',
    vetSenderName = null,
    savedMessage,
    pushToken,
} = {}) => {
    pool.query
        .mockResolvedValueOnce({ rows: [{ user_id: ownerId, resolved_at: null }] })  // verifyChatRelationship
        .mockResolvedValueOnce({ rows: [{ name: senderName }] })                     // loadSenderProfile
        .mockResolvedValueOnce({ rows: vetSenderName ? [{ name: vetSenderName }] : [] })  // resolveSenderDisplayName
        .mockResolvedValueOnce({ rows: [savedMessage] })                             // INSERT
        .mockResolvedValueOnce({ rows: [{ push_token: pushToken }] });               // SELECT push_token
};

describe('validateMessagePayload', () => {
    it('acepta payload válido', () => {
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 2, content: 'hola' }, 7))
            .toEqual({ ok: true, pet_id: 1, receiver_id: 2, content: 'hola' });
    });

    it('coerce a Number pet_id/receiver_id (llegan como string desde el cliente)', () => {
        expect(validateMessagePayload({ pet_id: '1', receiver_id: '2', content: 'hola' }, 7))
            .toEqual({ ok: true, pet_id: 1, receiver_id: 2, content: 'hola' });
    });

    it('rechaza pet_id inválido', () => {
        expect(validateMessagePayload({ pet_id: 'abc', receiver_id: 2, content: 'x' }, 7).reason)
            .toBe('invalid_pet_id');
        expect(validateMessagePayload({ pet_id: -1, receiver_id: 2, content: 'x' }, 7).reason)
            .toBe('invalid_pet_id');
        expect(validateMessagePayload({ pet_id: 1.5, receiver_id: 2, content: 'x' }, 7).reason)
            .toBe('invalid_pet_id');
    });

    it('rechaza receiver_id inválido', () => {
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 0, content: 'x' }, 7).reason)
            .toBe('invalid_receiver_id');
    });

    it('rechaza self-DM (receiver === sender)', () => {
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 7, content: 'x' }, 7).reason)
            .toBe('self_message');
    });

    it('rechaza content no-string, vacío o whitespace', () => {
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 2, content: null }, 7).reason)
            .toBe('invalid_content');
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 2, content: '' }, 7).reason)
            .toBe('empty_content');
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 2, content: '   ' }, 7).reason)
            .toBe('empty_content');
    });

    it('rechaza content excesivamente largo (>1000 chars)', () => {
        const huge = 'a'.repeat(MAX_CONTENT_LENGTH + 1);
        expect(validateMessagePayload({ pet_id: 1, receiver_id: 2, content: huge }, 7).reason)
            .toBe('content_too_long');
    });
});

describe('handleJoinPetChat', () => {
    it('une al socket a la sala pet_chat_{pet_id}', () => {
        const socket = makeSocket();
        const result = handleJoinPetChat({ socket, data: { pet_id: 42 } });
        expect(result.ok).toBe(true);
        expect(socket.join).toHaveBeenCalledWith('pet_chat_42');
    });

    it('rechaza pet_id inválido', () => {
        const socket = makeSocket();
        const result = handleJoinPetChat({ socket, data: {} });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('invalid_pet_id');
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

    describe('validación de payload', () => {
        it('rechaza payload inválido sin tocar DB', async () => {
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: '' },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('empty_content');
            expect(socket.emit).toHaveBeenCalledWith('error_notification', expect.any(String));
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('rechaza mensaje >1000 chars antes de la DB', async () => {
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'a'.repeat(1001) },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('content_too_long');
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('rechaza self-message (no puedo DMar a mí mismo)', async () => {
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 7, content: 'hola' },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('self_message');
        });
    });

    describe('verificación de relación con la mascota (security fix)', () => {
        it('rechaza si el pet no existe', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 999, receiver_id: 2, content: 'hola' },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('pet_not_found');
            expect(socket.emit).toHaveBeenCalledWith('error_notification', expect.any(String));
        });

        it('rechaza si ni sender ni receiver son el dueño de la mascota', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ user_id: 99, resolved_at: null }] });
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('not_related_to_pet');
            // No hace el INSERT porque cortó antes
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('rechaza si el caso ya está cerrado (pet.resolved_at != null)', async () => {
            pool.query.mockResolvedValueOnce({
                rows: [{ user_id: 7, resolved_at: '2026-07-08T00:00:00Z' }],
            });
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });
            expect(result.ok).toBe(false);
            expect(result.reason).toBe('case_closed');
            expect(socket.emit).toHaveBeenCalledWith(
                'error_notification',
                expect.stringMatching(/cerrado/i)
            );
            expect(pool.query).toHaveBeenCalledTimes(1);
        });

        it('acepta si el sender es el dueño', async () => {
            mockHappyPath(pool, {
                ownerId: 7,
                savedMessage: { id: 99, pet_id: 1, sender_id: 7, receiver_id: 2, content: 'hola' },
                pushToken: 'T',
            });
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });
            expect(result.ok).toBe(true);
        });

        it('acepta si el receiver es el dueño (caso finder → owner)', async () => {
            mockHappyPath(pool, {
                ownerId: 2,
                savedMessage: { id: 99, pet_id: 1, sender_id: 7, receiver_id: 2, content: 'hola' },
                pushToken: 'T',
            });
            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });
            expect(result.ok).toBe(true);
        });
    });

    describe('anti-spoofing del senderName (security fix)', () => {
        it('senderName sale de la DB, ignora lo que mande el cliente', async () => {
            mockHappyPath(pool, {
                ownerId: 7,
                senderName: 'Ana Real',
                savedMessage: { id: 99, sender_id: 7, receiver_id: 2, pet_id: 1, content: 'hola' },
                pushToken: 'T',
            });

            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: {
                    pet_id: 1, receiver_id: 2, content: 'hola',
                    senderName: 'Tu banco necesita tu contraseña', // spoofing intento
                },
            });

            await new Promise((r) => setImmediate(r));

            // El push usa el nombre real de la DB
            expect(sendExpoPush).toHaveBeenCalledWith('T', expect.objectContaining({
                title: 'Ana Real',
                data: expect.objectContaining({ name: 'Ana Real' }),
            }));
            // Y el new_notification también
            expect(io._emit).toHaveBeenCalledWith('new_notification', expect.objectContaining({
                senderName: 'Ana Real',
            }));
        });
    });

    describe('happy path', () => {
        it('guarda mensaje, notifica a ambos y dispara push', async () => {
            const savedMessage = {
                id: 99, pet_id: 1, sender_id: 7, receiver_id: 2, content: 'hola',
                created_at: new Date().toISOString(),
            };
            mockHappyPath(pool, {
                ownerId: 7, senderName: 'Ana',
                savedMessage, pushToken: 'ExponentPushToken[xxx]',
            });

            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: {
                    pet_id: 1, receiver_id: 2, content: 'hola',
                    petPhoto: 'https://x.com/p.jpg',
                },
            });

            expect(result.ok).toBe(true);
            expect(result.message.id).toBe(99);

            // El sender_id es el del socket (no del payload) — security invariant.
            // La query en index 3 es el INSERT (0=relación, 1=user name,
            // 2=vet name override, 3=INSERT).
            expect(pool.query.mock.calls[3][1]).toEqual([1, 7, 2, 'hola']);

            expect(io.to).toHaveBeenCalledWith('user_2');
            expect(io._emit).toHaveBeenCalledWith('receive_pet_message', savedMessage);
            expect(io._emit).toHaveBeenCalledWith('new_notification', expect.objectContaining({
                pet_id: 1, sender_id: 7, senderName: 'Ana',
                petPhoto: 'https://x.com/p.jpg', content: 'hola',
            }));
            expect(socket.emit).toHaveBeenCalledWith('receive_pet_message', savedMessage);

            await new Promise((r) => setImmediate(r));
            expect(sendExpoPush).toHaveBeenCalledWith('ExponentPushToken[xxx]', expect.objectContaining({
                title: 'Ana', body: 'hola',
            }));
        });

        it('no envía push si el receptor no tiene push_token', async () => {
            mockHappyPath(pool, {
                ownerId: 7, senderName: 'Ana',
                savedMessage: { id: 100, sender_id: 7, receiver_id: 2, pet_id: 1, content: 'x' },
                pushToken: null,
            });
            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'x' },
            });
            await new Promise((r) => setImmediate(r));
            expect(sendExpoPush).not.toHaveBeenCalled();
        });

        it('trunca el body del push si el mensaje es muy largo (>120 chars)', async () => {
            mockHappyPath(pool, {
                ownerId: 7, senderName: 'X',
                savedMessage: { id: 101, sender_id: 7, receiver_id: 2, pet_id: 1 },
                pushToken: 'T',
            });
            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'a'.repeat(200) },
            });
            await new Promise((r) => setImmediate(r));
            const [, notif] = sendExpoPush.mock.calls[0];
            expect(notif.body.length).toBe(118);
            expect(notif.body.endsWith('…')).toBe(true);
        });
    });

    describe('vet override del senderName', () => {
        it('cuando el sender es owner de la vet que reportó el pet, el push usa el nombre de la vet', async () => {
            mockHappyPath(pool, {
                ownerId: 7,
                senderName: 'Juan Pérez', // nombre personal
                vetSenderName: 'Veterinaria Amigo', // vet override
                savedMessage: { id: 99, sender_id: 7, receiver_id: 2, pet_id: 1, content: 'hola' },
                pushToken: 'T',
            });

            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });

            await new Promise((r) => setImmediate(r));

            // El push llega con el nombre de la vet, no del user personal
            expect(sendExpoPush).toHaveBeenCalledWith('T', expect.objectContaining({
                title: 'Veterinaria Amigo',
            }));
            expect(io._emit).toHaveBeenCalledWith('new_notification', expect.objectContaining({
                senderName: 'Veterinaria Amigo',
            }));
        });

        it('cuando el sender NO es owner de vet (o el pet no es de vet), usa el nombre del user', async () => {
            mockHappyPath(pool, {
                ownerId: 7,
                senderName: 'Juan Pérez',
                vetSenderName: null, // no matchea la vet
                savedMessage: { id: 99, sender_id: 7, receiver_id: 2, pet_id: 1, content: 'hola' },
                pushToken: 'T',
            });

            await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });

            await new Promise((r) => setImmediate(r));
            expect(sendExpoPush).toHaveBeenCalledWith('T', expect.objectContaining({
                title: 'Juan Pérez',
            }));
        });
    });

    describe('error handling', () => {
        it('emite error_notification y devuelve db_error si falla el INSERT', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ user_id: 7, resolved_at: null }] })  // verifyChatRelationship OK
                .mockResolvedValueOnce({ rows: [{ name: 'Ana' }] })                    // loadSenderProfile OK
                .mockResolvedValueOnce({ rows: [] })                                   // resolveSenderDisplayName (sin vet override)
                .mockRejectedValueOnce(new Error('db down'));                          // INSERT falla

            const result = await handleSendPetMessage({
                pool, io, sendExpoPush, socket,
                data: { pet_id: 1, receiver_id: 2, content: 'hola' },
            });

            expect(result.ok).toBe(false);
            expect(result.reason).toBe('db_error');
            expect(socket.emit).toHaveBeenCalledWith('error_notification', expect.any(String));
        });
    });
});
