import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db.js', () => ({ default: { query: vi.fn() } }));

const { default: pool } = await import('../db.js');
const { sendExpoPush, checkPushReceipts, _pendingReceiptsForTest } = await import('../utils/push.js');

const okTicket = (id) => ({ status: 'ok', id });
const deadTicket = () => ({ status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } });

function mockFetch(payload, ok = true, status = 200) {
    global.fetch = vi.fn(() => Promise.resolve({
        ok,
        status,
        json: () => Promise.resolve(payload),
        text: () => Promise.resolve(JSON.stringify(payload)),
    }));
}

const queue = _pendingReceiptsForTest();

beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rowCount: 1 });
    queue.length = 0; // limpiar cola en memoria entre tests.
});

describe('sendExpoPush', () => {
    it('ignora tokens que no son ExponentPushToken (no llama a fetch)', async () => {
        global.fetch = vi.fn();
        await sendExpoPush(['garbage', null, ''], { title: 't', body: 'b' });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('poda el token cuando el ticket es DeviceNotRegistered', async () => {
        mockFetch({ data: [deadTicket()] });
        await sendExpoPush('ExponentPushToken[dead]', { title: 't', body: 'b' });
        expect(pool.query).toHaveBeenCalledWith(
            'UPDATE users SET push_token = NULL WHERE push_token = $1',
            ['ExponentPushToken[dead]']
        );
    });

    it('encola el ticket ok para chequear receipt después', async () => {
        mockFetch({ data: [okTicket('R-1')] });
        await sendExpoPush('ExponentPushToken[ok]', { title: 't', body: 'b' });
        expect(pool.query).not.toHaveBeenCalled(); // ok no poda
        expect(queue).toHaveLength(1);
        expect(queue[0]).toMatchObject({ id: 'R-1', token: 'ExponentPushToken[ok]' });
    });

    it('mapea tickets a tokens por orden (poda solo el muerto)', async () => {
        mockFetch({ data: [okTicket('R-a'), deadTicket()] });
        await sendExpoPush(['ExponentPushToken[a]', 'ExponentPushToken[b]'], { title: 't', body: 'b' });
        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['ExponentPushToken[b]']);
        expect(queue).toHaveLength(1);
        expect(queue[0].token).toBe('ExponentPushToken[a]');
    });
});

describe('checkPushReceipts', () => {
    it('no chequea tickets que no maduraron (recién encolados)', async () => {
        queue.push({ id: 'R-young', token: 'ExponentPushToken[y]', at: Date.now() });
        global.fetch = vi.fn();
        const result = await checkPushReceipts();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toEqual({ checked: 0, pruned: 0 });
        expect(queue).toHaveLength(1); // sigue pendiente
    });

    it('poda el token cuando el receipt es DeviceNotRegistered', async () => {
        // Ticket viejo (16 min) → maduro.
        queue.push({ id: 'R-old', token: 'ExponentPushToken[old]', at: Date.now() - 16 * 60 * 1000 });
        mockFetch({ data: { 'R-old': deadTicket() } });
        const result = await checkPushReceipts();
        expect(pool.query).toHaveBeenCalledWith(
            'UPDATE users SET push_token = NULL WHERE push_token = $1',
            ['ExponentPushToken[old]']
        );
        expect(result).toEqual({ checked: 1, pruned: 1 });
        expect(queue).toHaveLength(0); // consumido
    });

    it('no poda si el receipt es ok', async () => {
        queue.push({ id: 'R-ok', token: 'ExponentPushToken[ok]', at: Date.now() - 16 * 60 * 1000 });
        mockFetch({ data: { 'R-ok': { status: 'ok' } } });
        const result = await checkPushReceipts();
        expect(pool.query).not.toHaveBeenCalled();
        expect(result).toEqual({ checked: 1, pruned: 0 });
    });

    it('descarta tickets demasiado viejos (>1h) sin consultarlos', async () => {
        queue.push({ id: 'R-ancient', token: 'ExponentPushToken[z]', at: Date.now() - 2 * 60 * 60 * 1000 });
        global.fetch = vi.fn();
        const result = await checkPushReceipts();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toEqual({ checked: 0, pruned: 0 });
        expect(queue).toHaveLength(0); // descartado
    });
});
