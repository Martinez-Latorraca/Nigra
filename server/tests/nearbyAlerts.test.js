import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks para poder importar petController sin volar por deps externas
// del reportPet/searchPet. Sólo nos interesa notifyNearbyUsers.
vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));
vi.mock('../ai.js', () => ({
    loadModel: vi.fn(),
    generateEmbedding: vi.fn(),
    generateEmbeddings: vi.fn(),
}));
vi.mock('../utils/geocode.js', () => ({
    reverseGeocode: vi.fn(),
    searchAddress: vi.fn(),
}));
vi.mock('../utils/push.js', () => ({ sendExpoPush: vi.fn() }));
vi.mock('cloudinary', () => ({ v2: { config: vi.fn() } }));

const { notifyNearbyUsers } = await import('../controllers/petController.js');

const makeDeps = () => {
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })), _emit: emit };
    const sendExpoPush = vi.fn();
    const pool = { query: vi.fn() };
    return { pool, io, sendExpoPush };
};

const basePet = {
    id: 42, status: 'lost', type: 'dog', photo_url: 'https://cdn/x.jpg',
    name: 'Rocky', address: 'Pocitos, Montevideo',
    lat: -34.9128, lng: -56.1478,
};

describe('notifyNearbyUsers', () => {
    let deps;
    beforeEach(() => { deps = makeDeps(); });

    it('sin coords: no hace nada', async () => {
        await notifyNearbyUsers({ ...deps, newPet: { ...basePet, lat: null }, reporterId: 1 });
        expect(deps.pool.query).not.toHaveBeenCalled();
    });

    it('status distinto de lost/found: skip', async () => {
        await notifyNearbyUsers({ ...deps, newPet: { ...basePet, status: 'resolved' }, reporterId: 1 });
        expect(deps.pool.query).not.toHaveBeenCalled();
    });

    it('sin candidatos: no dispara push ni notification', async () => {
        deps.pool.query.mockResolvedValueOnce({ rows: [] }); // SELECT users cerca
        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.pool.query).toHaveBeenCalledTimes(1); // sólo el SELECT
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
    });

    it('lost: genera notif type=nearby_lost + push + socket para cada candidato', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: 'T1' }] })  // candidatos
            .mockResolvedValueOnce({ rows: [] })                                          // dedupe: no existe
            .mockResolvedValueOnce({                                                       // insert notif
                rows: [{ id: 100, user_id: 7, type: 'nearby_lost', data: {}, read_at: null, created_at: '' }],
            });

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });

        // 1) La query de candidatos usa haversine con radio 5km y filtra por opt-in + fresh location + no reporter.
        // NO filtra por push_token — la notification se genera igual para users web-only.
        const [selectSql, selectParams] = deps.pool.query.mock.calls[0];
        expect(selectSql).toMatch(/notify_nearby = true/);
        expect(selectSql).toMatch(/last_location_at > NOW\(\) - INTERVAL '30 days'/);
        expect(selectSql).toMatch(/u\.id <> \$3/);
        expect(selectSql).toMatch(/6371 \* acos/); // haversine
        expect(selectSql).not.toMatch(/push_token IS NOT NULL/);
        expect(selectParams).toEqual([basePet.lat, basePet.lng, 1, 5]); // radio 5km

        // 2) INSERT notification con type nearby_lost + payload correcto
        const [insertSql, insertParams] = deps.pool.query.mock.calls[2];
        expect(insertSql).toMatch(/INSERT INTO notifications/);
        expect(insertParams[0]).toBe(7);
        expect(insertParams[1]).toBe('nearby_lost');
        const data = JSON.parse(insertParams[2]);
        expect(data.pet_id).toBe(42);
        expect(data.pet_status).toBe('lost');
        expect(data.name).toBe('Rocky');

        // 3) Socket emit a la sala del user cercano
        expect(deps.io.to).toHaveBeenCalledWith('user_7');
        expect(deps.io._emit).toHaveBeenCalledWith(
            'new_match_notification',
            expect.objectContaining({ type: 'nearby_lost' })
        );

        // 4) Push
        expect(deps.sendExpoPush).toHaveBeenCalledWith('T1', expect.objectContaining({
            title: expect.stringMatching(/perdida/i),
            body: expect.stringContaining('Rocky'),
            data: expect.objectContaining({
                type: 'nearby_lost',
                pet_id: 42,
                receiver_id: 7,
            }),
        }));
    });

    it('found: type=nearby_found + copy en título coherente', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: 'T1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 100 }] });

        await notifyNearbyUsers({ ...deps, newPet: { ...basePet, status: 'found' }, reporterId: 1 });

        const [, insertParams] = deps.pool.query.mock.calls[2];
        expect(insertParams[1]).toBe('nearby_found');
        expect(deps.sendExpoPush).toHaveBeenCalledWith('T1', expect.objectContaining({
            title: expect.stringMatching(/encontr/i),
        }));
    });

    it('dedupe: si ya hay notification del mismo pet para el user, skip insert + push', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: 'T1' }] })
            .mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // exists

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });

        // Sólo 2 queries: candidatos + dedupe. NO se ejecuta el INSERT.
        expect(deps.pool.query).toHaveBeenCalledTimes(2);
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
        expect(deps.io._emit).not.toHaveBeenCalled();
    });

    it('user sin push_token igual recibe la notification en el inbox (fix: web-only users)', async () => {
        deps.pool.query
            .mockResolvedValueOnce({ rows: [{ id: 7, name: 'Ana', push_token: null }] })  // sin push_token
            .mockResolvedValueOnce({ rows: [] })                                          // dedupe
            .mockResolvedValueOnce({ rows: [{ id: 100 }] });                              // insert notif

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });

        // Notification insertada + socket emit ok
        expect(deps.pool.query).toHaveBeenCalledTimes(3);
        expect(deps.io.to).toHaveBeenCalledWith('user_7');
        // Pero NO se dispara el push (no hay token)
        expect(deps.sendExpoPush).not.toHaveBeenCalled();
    });

    it('procesa múltiples candidatos en la misma corrida', async () => {
        deps.pool.query
            .mockResolvedValueOnce({
                rows: [
                    { id: 7, name: 'Ana', push_token: 'T1' },
                    { id: 8, name: 'Beto', push_token: 'T2' },
                ],
            })
            .mockResolvedValueOnce({ rows: [] })                                        // dedupe u7
            .mockResolvedValueOnce({ rows: [{ id: 100 }] })                             // insert u7
            .mockResolvedValueOnce({ rows: [] })                                        // dedupe u8
            .mockResolvedValueOnce({ rows: [{ id: 101 }] });                            // insert u8

        await notifyNearbyUsers({ ...deps, newPet: basePet, reporterId: 1 });
        expect(deps.sendExpoPush).toHaveBeenCalledTimes(2);
    });
});
