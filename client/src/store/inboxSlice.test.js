import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import inboxReducer, {
    fetchInbox,
    setActiveChatInbox,
    markAsReadLocal,
} from './inboxSlice';

const buildStore = (user = { token: 'tok', data: { id: 7 } }) =>
    configureStore({
        reducer: {
            user: () => user,
            inbox: inboxReducer,
        },
    });

describe('inboxSlice', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    describe('reducer: setActiveChatInbox', () => {
        it('setea el activeChatId', () => {
            const store = buildStore();
            store.dispatch(setActiveChatInbox(42));
            expect(store.getState().inbox.activeChatId).toBe(42);
        });
    });

    describe('reducer: markAsReadLocal', () => {
        it('marca is_read=true en el mensaje del pet_id', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { pet_id: 1, content: 'a', is_read: false },
                    { pet_id: 2, content: 'b', is_read: false },
                ],
            });
            const store = buildStore();
            await store.dispatch(fetchInbox());

            store.dispatch(markAsReadLocal(1));
            const msgs = store.getState().inbox.messages;
            expect(msgs.find(m => m.pet_id === 1).is_read).toBe(true);
            expect(msgs.find(m => m.pet_id === 2).is_read).toBe(false);
        });

        it('no rompe si el pet_id no existe', () => {
            const store = buildStore();
            store.dispatch(markAsReadLocal(999));
            expect(store.getState().inbox.messages).toEqual([]);
        });
    });

    describe('thunk: fetchInbox', () => {
        it('guarda los mensajes con status succeeded', async () => {
            const inbox = [{ pet_id: 1, content: 'hola', is_read: false }];
            global.fetch.mockResolvedValueOnce({ ok: true, json: async () => inbox });

            const store = buildStore();
            await store.dispatch(fetchInbox());

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/api/messages/inbox',
                expect.objectContaining({ headers: { Authorization: 'Bearer tok' } })
            );
            expect(store.getState().inbox.messages).toEqual(inbox);
            expect(store.getState().inbox.status).toBe('succeeded');
        });

        it('marca is_read=true si el pet_id coincide con activeChatId', async () => {
            const store = buildStore();
            store.dispatch(setActiveChatInbox(1));

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { pet_id: 1, content: 'activo', is_read: false },
                    { pet_id: 2, content: 'otro', is_read: false },
                ],
            });
            await store.dispatch(fetchInbox());

            const msgs = store.getState().inbox.messages;
            expect(msgs.find(m => m.pet_id === 1).is_read).toBe(true);
            expect(msgs.find(m => m.pet_id === 2).is_read).toBe(false);
        });
    });
});
