import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks para que api.js pueda cargarse en Node (fuera del runtime de RN).
vi.mock('react-native', () => ({ Alert: { alert: vi.fn() } }));
vi.mock('expo-router', () => ({ router: { replace: vi.fn() } }));
vi.mock('../store/store', () => ({
    store: {
        dispatch: vi.fn(),
        getState: () => ({ user: { token: null } }),
    },
}));
vi.mock('./config', () => ({ API_URL: 'http://localhost:3000' }));

const { isTokenError, createAuthErrorHandler, AUTH_ENDPOINTS } = await import('./api');
const { clearCredentials } = await import('../store/userSlice');

describe('isTokenError', () => {
    it('true en 401 (cualquier mensaje)', () => {
        expect(isTokenError(401, 'algo')).toBe(true);
        expect(isTokenError(401, '')).toBe(true);
    });

    it('true en 403 con mensaje de token/expiración', () => {
        expect(isTokenError(403, 'Token inválido o expirado')).toBe(true);
        expect(isTokenError(403, 'jwt expired')).toBe(true);
        expect(isTokenError(403, 'TOKEN')).toBe(true);
    });

    it('false en 403 por permisos (no menciona token)', () => {
        expect(isTokenError(403, 'Acceso denegado. Se requiere rol de administrador.')).toBe(false);
        expect(isTokenError(403, 'No autorizado')).toBe(false);
    });

    it('false en otros status', () => {
        expect(isTokenError(200, '')).toBe(false);
        expect(isTokenError(400, 'token bad')).toBe(false);
        expect(isTokenError(500, 'token expired')).toBe(false);
    });
});

describe('AUTH_ENDPOINTS', () => {
    it('incluye login/register/oauth', () => {
        expect(AUTH_ENDPOINTS).toEqual([
            '/api/auth/login',
            '/api/auth/register',
            '/api/oauth/',
        ]);
    });
});

describe('createAuthErrorHandler', () => {
    let deps, handler;
    const makeError = (status, url = '/api/pets', message = 'x') => ({
        response: { status, data: { error: message } },
        config: { url },
    });

    beforeEach(() => {
        deps = {
            dispatch: vi.fn(),
            alert: vi.fn(),
            navigate: vi.fn(),
            setTimeoutFn: vi.fn((cb) => { deps._pending = cb; }),
        };
        handler = createAuthErrorHandler(deps);
    });

    it('dispara logout completo en 401', async () => {
        await expect(handler(makeError(401))).rejects.toBeDefined();
        expect(deps.dispatch).toHaveBeenCalledWith(clearCredentials());
        expect(deps.alert).toHaveBeenCalledWith(
            'Sesión expirada',
            expect.stringMatching(/inici/i)
        );
        expect(deps.navigate).toHaveBeenCalledWith('/login');
    });

    it('dispara logout en 403 con "token expirado"', async () => {
        await expect(handler(makeError(403, '/api/pets', 'Token inválido o expirado')))
            .rejects.toBeDefined();
        expect(deps.navigate).toHaveBeenCalledWith('/login');
    });

    it('NO dispara logout en 403 por permisos (adminAuth)', async () => {
        await expect(handler(makeError(403, '/api/admin/stats', 'Acceso denegado. Se requiere rol de administrador.')))
            .rejects.toBeDefined();
        expect(deps.dispatch).not.toHaveBeenCalled();
        expect(deps.navigate).not.toHaveBeenCalled();
    });

    it('NO dispara logout si la request es a /api/auth/login (aunque devuelva 401)', async () => {
        await expect(handler(makeError(401, '/api/auth/login', 'Credenciales inválidas')))
            .rejects.toBeDefined();
        expect(deps.dispatch).not.toHaveBeenCalled();
    });

    it('NO dispara logout si la request es a /api/oauth/google', async () => {
        await expect(handler(makeError(403, '/api/oauth/google', 'Token inválido o expirado')))
            .rejects.toBeDefined();
        expect(deps.dispatch).not.toHaveBeenCalled();
    });

    it('rechazo en cadena: dos errores 401 juntos solo generan UN Alert (lockout)', async () => {
        await expect(handler(makeError(401))).rejects.toBeDefined();
        await expect(handler(makeError(401))).rejects.toBeDefined();
        expect(deps.alert).toHaveBeenCalledTimes(1);
        expect(deps.navigate).toHaveBeenCalledTimes(1);
        expect(deps.dispatch).toHaveBeenCalledTimes(1);
        // El timeout se programó para liberar el lockout
        expect(deps.setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('después de que expira el timeout, otro 401 dispara logout de nuevo', async () => {
        await expect(handler(makeError(401))).rejects.toBeDefined();
        // Simulamos que pasó 1s
        deps._pending?.();
        await expect(handler(makeError(401))).rejects.toBeDefined();
        expect(deps.alert).toHaveBeenCalledTimes(2);
    });

    it('siempre re-rechaza el error para que el .catch() del caller lo reciba', async () => {
        const err = makeError(200, '/api/pets', 'ok');
        await expect(handler(err)).rejects.toBe(err);
    });
});
