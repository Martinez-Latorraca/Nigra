import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildReminderQuery, runReminderTick } from '../lib/resolveReminder.js';

describe('resolveReminder', () => {
    describe('buildReminderQuery', () => {
        it('devuelve un SQL con las 3 condiciones esenciales', () => {
            const sql = buildReminderQuery();
            expect(sql).toMatch(/resolved_at\s+IS\s+NULL/i);
            expect(sql).toMatch(/72 hours/);   // ventana de actividad reciente
            expect(sql).toMatch(/60 minutes/); // dejaron de hablar hace >=1h
            expect(sql).toMatch(/resolve_reminder/);
        });
    });

    describe('runReminderTick', () => {
        let pool, io, sendExpoPush;

        beforeEach(() => {
            pool = { query: vi.fn() };
            io = { to: vi.fn(() => ({ emit: vi.fn() })), _emit: vi.fn() };
            sendExpoPush = vi.fn();
        });

        it('sin candidatos: no hace inserts ni push', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });
            const result = await runReminderTick({ pool, io, sendExpoPush });
            expect(result.count).toBe(0);
            expect(pool.query).toHaveBeenCalledTimes(1); // solo el SELECT
            expect(sendExpoPush).not.toHaveBeenCalled();
        });

        it('con candidatos: inserta notification + emite socket + push', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{
                        pet_id: 5, pet_name: 'Rocky', owner_id: 7,
                        push_token: 'ExponentPushToken[abc]', owner_name: 'Ana',
                    }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 1, type: 'resolve_reminder',
                        data: { pet_id: 5, pet_name: 'Rocky' },
                        read_at: null, created_at: new Date().toISOString(),
                    }],
                });

            const emit = vi.fn();
            io.to = vi.fn(() => ({ emit }));

            const result = await runReminderTick({ pool, io, sendExpoPush });
            expect(result.count).toBe(1);

            // INSERT en notifications
            const [insertSql, insertParams] = pool.query.mock.calls[1];
            expect(insertSql).toMatch(/INSERT INTO notifications/i);
            expect(insertParams[0]).toBe(7);
            expect(JSON.parse(insertParams[1])).toEqual({ pet_id: 5, pet_name: 'Rocky' });

            // Emit
            expect(io.to).toHaveBeenCalledWith('user_7');
            expect(emit).toHaveBeenCalledWith('new_match_notification', expect.objectContaining({
                type: 'resolve_reminder',
            }));

            // Push
            expect(sendExpoPush).toHaveBeenCalledWith('ExponentPushToken[abc]', expect.objectContaining({
                title: expect.stringMatching(/reencontraste/i),
                body: expect.stringContaining('Rocky'),
                data: expect.objectContaining({
                    type: 'resolve_reminder',
                    pet_id: 5,
                    receiver_id: 7,
                }),
            }));
        });

        it('sin push_token: guarda notification pero no dispara push', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{ pet_id: 1, pet_name: 'X', owner_id: 7, push_token: null }],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 1, type: 'resolve_reminder', data: {}, read_at: null, created_at: '' }],
                });

            await runReminderTick({ pool, io, sendExpoPush });
            expect(sendExpoPush).not.toHaveBeenCalled();
        });

        it('pet sin nombre: el push omite el nombre gracefully', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [{ pet_id: 1, pet_name: null, owner_id: 7, push_token: 'T' }],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 1, type: 'resolve_reminder', data: {}, read_at: null, created_at: '' }],
                });

            await runReminderTick({ pool, io, sendExpoPush });
            const [, notif] = sendExpoPush.mock.calls[0];
            // No debería tener " a null" ni " a undefined" en el body
            expect(notif.body).not.toMatch(/null|undefined/);
        });

        it('procesa múltiples candidatos en la misma corrida', async () => {
            pool.query
                .mockResolvedValueOnce({
                    rows: [
                        { pet_id: 1, pet_name: 'A', owner_id: 7, push_token: 'T1' },
                        { pet_id: 2, pet_name: 'B', owner_id: 8, push_token: 'T2' },
                    ],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 1, type: 'resolve_reminder', data: {}, read_at: null, created_at: '' }],
                })
                .mockResolvedValueOnce({
                    rows: [{ id: 2, type: 'resolve_reminder', data: {}, read_at: null, created_at: '' }],
                });

            const result = await runReminderTick({ pool, io, sendExpoPush });
            expect(result.count).toBe(2);
            expect(sendExpoPush).toHaveBeenCalledTimes(2);
        });
    });
});
