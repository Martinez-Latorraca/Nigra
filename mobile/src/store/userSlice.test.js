import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import userReducer, { setCredentials, clearCredentials } from './userSlice';

const buildStore = () => configureStore({ reducer: { user: userReducer } });

describe('userSlice (mobile)', () => {
    it('estado inicial: data + token en null', () => {
        const store = buildStore();
        expect(store.getState().user).toEqual({ data: null, token: null });
    });

    it('setCredentials guarda user + token', () => {
        const store = buildStore();
        store.dispatch(setCredentials({
            user: { id: 7, name: 'Ana', email: 'a@a.com', role: 'user' },
            token: 'jwt.xyz',
        }));
        expect(store.getState().user.token).toBe('jwt.xyz');
        expect(store.getState().user.data.id).toBe(7);
    });

    it('clearCredentials resetea al estado inicial', () => {
        const store = buildStore();
        store.dispatch(setCredentials({
            user: { id: 7, name: 'Ana' },
            token: 't',
        }));
        store.dispatch(clearCredentials());
        expect(store.getState().user).toEqual({ data: null, token: null });
    });
});
