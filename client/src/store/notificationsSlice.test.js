import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer, {
    prependNotification,
    fetchNotifications,
    markNotificationRead,
} from './notificationsSlice';

const buildStore = (initialUser = { token: 'tok', data: { id: 7 } }) =>
    configureStore({
        reducer: {
            user: () => initialUser,
            notifications: notificationsReducer,
        },
    });

describe('notificationsSlice', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    describe('reducer: prependNotification', () => {
        it('agrega una notificación nueva al principio', () => {
            const store = buildStore();
            store.dispatch(prependNotification({ id: 1, type: 'match', data: {} }));
            store.dispatch(prependNotification({ id: 2, type: 'match', data: {} }));
            expect(store.getState().notifications.list.map(n => n.id)).toEqual([2, 1]);
        });

        it('no duplica si ya existe con el mismo id', () => {
            const store = buildStore();
            store.dispatch(prependNotification({ id: 1, type: 'match' }));
            store.dispatch(prependNotification({ id: 1, type: 'match' }));
            expect(store.getState().notifications.list).toHaveLength(1);
        });
    });

    describe('thunk: fetchNotifications', () => {
        it('llama al endpoint con el token y guarda la lista', async () => {
            const list = [{ id: 1, type: 'match', read_at: null }];
            global.fetch.mockResolvedValueOnce({ ok: true, json: async () => list });

            const store = buildStore();
            await store.dispatch(fetchNotifications());

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/notifications',
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
                })
            );
            expect(store.getState().notifications.list).toEqual(list);
            expect(store.getState().notifications.status).toBe('succeeded');
        });

        it('convierte respuesta no-array en []', async () => {
            global.fetch.mockResolvedValueOnce({ ok: true, json: async () => null });
            const store = buildStore();
            await store.dispatch(fetchNotifications());
            expect(store.getState().notifications.list).toEqual([]);
        });

        it('deja la lista intacta si la respuesta no es ok (rejected)', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false });
            const store = buildStore();
            // Precargamos una notificación para verificar que no la borra
            store.dispatch(prependNotification({ id: 99, type: 'match' }));
            await store.dispatch(fetchNotifications());
            expect(store.getState().notifications.list.map(n => n.id)).toEqual([99]);
        });
    });

    describe('thunk: markNotificationRead', () => {
        it('llama PATCH al endpoint correcto y setea read_at localmente', async () => {
            global.fetch.mockResolvedValueOnce({ ok: true });
            const store = buildStore();
            store.dispatch(prependNotification({ id: 42, type: 'match', read_at: null }));

            await store.dispatch(markNotificationRead(42));

            const [url, init] = global.fetch.mock.calls[0];
            expect(url).toBe('http://localhost:3000/api/notifications/42/read');
            expect(init.method).toBe('PATCH');
            expect(init.headers.Authorization).toBe('Bearer tok');

            const n = store.getState().notifications.list.find(x => x.id === 42);
            expect(n.read_at).toBeTruthy();
        });

        it('no pisa el read_at si ya estaba marcada', async () => {
            global.fetch.mockResolvedValueOnce({ ok: true });
            const store = buildStore();
            const original = '2026-06-01T00:00:00.000Z';
            store.dispatch(prependNotification({ id: 42, type: 'match', read_at: original }));

            await store.dispatch(markNotificationRead(42));

            const n = store.getState().notifications.list.find(x => x.id === 42);
            expect(n.read_at).toBe(original);
        });
    });
});
