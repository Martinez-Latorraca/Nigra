import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import userReducer, {
    setCredentials,
    clearCredentials,
    updateUserData,
} from './userSlice';

const buildStore = () =>
    configureStore({ reducer: { user: userReducer } });

describe('userSlice', () => {
    it('estado inicial: data + token en null', () => {
        const store = buildStore();
        expect(store.getState().user).toEqual({ data: null, token: null });
    });

    it('setCredentials guarda user + token', () => {
        const store = buildStore();
        store.dispatch(setCredentials({
            user: { id: 1, name: 'Ana', email: 'a@a.com' },
            token: 'jwt.abc',
        }));
        expect(store.getState().user.token).toBe('jwt.abc');
        expect(store.getState().user.data.name).toBe('Ana');
    });

    it('clearCredentials resetea a null (logout)', () => {
        const store = buildStore();
        store.dispatch(setCredentials({
            user: { id: 1, name: 'Ana' },
            token: 'jwt.abc',
        }));
        store.dispatch(clearCredentials());
        expect(store.getState().user).toEqual({ data: null, token: null });
    });

    it('updateUserData actualiza phone + address sin pisar otros campos', () => {
        const store = buildStore();
        store.dispatch(setCredentials({
            user: { id: 1, name: 'Ana', email: 'a@a.com' },
            token: 't',
        }));
        store.dispatch(updateUserData({ phone: '099123456', address: 'Calle X' }));
        expect(store.getState().user.data).toEqual({
            id: 1, name: 'Ana', email: 'a@a.com',
            phone: '099123456', address: 'Calle X',
        });
    });

    it('updateUserData es no-op si no hay user cargado', () => {
        const store = buildStore();
        store.dispatch(updateUserData({ phone: '099', address: 'Y' }));
        expect(store.getState().user.data).toBeNull();
    });
});
