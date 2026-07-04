import { describe, it, expect, vi, beforeEach } from 'vitest';

// Necesitamos mockear todo el ecosistema que push.js carga en su top-level,
// para poder importar el módulo desde Node.
vi.mock('react-native', () => ({ Alert: { alert: vi.fn() }, Platform: { OS: 'android' } }));
vi.mock('react', () => ({ useEffect: vi.fn() }));
vi.mock('react-redux', () => ({ useSelector: vi.fn() }));
vi.mock('expo-notifications', () => ({
    setNotificationHandler: vi.fn(),
    setNotificationChannelAsync: vi.fn(),
    getPermissionsAsync: vi.fn(),
    requestPermissionsAsync: vi.fn(),
    getExpoPushTokenAsync: vi.fn(),
    addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
    AndroidImportance: { MAX: 5 },
}));
vi.mock('expo-device', () => ({ isDevice: true }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: { eas: { projectId: 'p' } } } } }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('./api', () => ({ default: { post: vi.fn() } }));
vi.mock('../store/store', () => ({
    store: { getState: () => ({ user: { data: null } }) },
}));

const { createNotificationResponseHandler } = await import('./push');

// Helper para armar un objeto de respuesta con la shape que Expo Notifications
// entrega al listener.
const makeResponse = (data) => ({
    notification: { request: { content: { data } } },
});

describe('createNotificationResponseHandler', () => {
    let deps, handle;

    beforeEach(() => {
        deps = {
            getUser: vi.fn(() => ({ id: 7, name: 'Ana' })),
            alert: vi.fn(),
            navigate: vi.fn(),
        };
        handle = createNotificationResponseHandler(deps);
    });

    describe('validación receiver_id (seguridad cross-account)', () => {
        it('BLOQUEA con alert "iniciá sesión" si no hay user logueado y hay receiver_id', () => {
            deps.getUser = () => null;
            handle = createNotificationResponseHandler(deps);
            handle(makeResponse({ type: 'message', pet_id: 1, otherUserId: 2, receiver_id: 7 }));
            expect(deps.alert).toHaveBeenCalledWith(
                'Iniciá sesión',
                expect.stringMatching(/iniciar sesi/i)
            );
            expect(deps.navigate).not.toHaveBeenCalled();
        });

        it('BLOQUEA con alert "notificación de otra cuenta" si receiver_id != user.id', () => {
            handle(makeResponse({ type: 'message', pet_id: 1, otherUserId: 2, receiver_id: 99 }));
            expect(deps.alert).toHaveBeenCalledWith(
                'Notificación de otra cuenta',
                expect.stringContaining('Ana')
            );
            expect(deps.navigate).not.toHaveBeenCalled();
        });

        it('DEJA pasar si receiver_id coincide con el user logueado', () => {
            handle(makeResponse({ type: 'message', pet_id: 1, otherUserId: 2, receiver_id: 7 }));
            expect(deps.alert).not.toHaveBeenCalled();
            expect(deps.navigate).toHaveBeenCalled();
        });

        it('DEJA pasar si el push no trae receiver_id (retro-compat versión vieja del server)', () => {
            handle(makeResponse({ type: 'message', pet_id: 1, otherUserId: 2 }));
            expect(deps.alert).not.toHaveBeenCalled();
            expect(deps.navigate).toHaveBeenCalled();
        });

        it('compara receiver_id/id como Number (string vs int)', () => {
            handle(makeResponse({ type: 'message', pet_id: '1', otherUserId: '2', receiver_id: '7' }));
            expect(deps.navigate).toHaveBeenCalled();
        });
    });

    describe('navegación', () => {
        it('type=message: navega a /chat/:pet_id con params serializados', () => {
            handle(makeResponse({
                type: 'message',
                pet_id: 5,
                otherUserId: 42,
                receiver_id: 7,
                name: 'Rocky',
                photo: 'https://x.com/r.jpg',
            }));
            expect(deps.navigate).toHaveBeenCalledWith({
                pathname: '/chat/5',
                params: {
                    otherUserId: '42',
                    name: 'Rocky',
                    photo: 'https://x.com/r.jpg',
                },
            });
        });

        it('type=match: navega a /pet/:pet_id (string simple)', () => {
            handle(makeResponse({ type: 'match', pet_id: 42, receiver_id: 7 }));
            expect(deps.navigate).toHaveBeenCalledWith('/pet/42');
        });

        it('type desconocido: no navega', () => {
            handle(makeResponse({ type: 'other', pet_id: 1, receiver_id: 7 }));
            expect(deps.navigate).not.toHaveBeenCalled();
        });

        it('type=message pero falta otherUserId: no navega', () => {
            handle(makeResponse({ type: 'message', pet_id: 1, receiver_id: 7 }));
            expect(deps.navigate).not.toHaveBeenCalled();
        });

        it('response vacío / malformado: no revienta ni navega', () => {
            expect(() => handle(null)).not.toThrow();
            expect(() => handle({})).not.toThrow();
            expect(() => handle({ notification: {} })).not.toThrow();
            expect(deps.navigate).not.toHaveBeenCalled();
        });
    });
});
