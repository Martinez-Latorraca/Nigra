import { describe, it, expect } from 'vitest';

// Sin POSTHOG_API_KEY en el entorno de test, el módulo debe quedar no-op:
// track() no lanza, no hace nada, y analyticsEnabled es false. Esto garantiza
// que la instrumentación esparcida por los controllers nunca rompe un request
// ni los tests cuando no hay key configurada.
const { track, analyticsEnabled, shutdownAnalytics } = await import('../lib/analytics.js');

describe('analytics (sin POSTHOG_API_KEY)', () => {
    it('queda deshabilitado', () => {
        expect(analyticsEnabled).toBe(false);
    });

    it('track() es no-op y no lanza', () => {
        expect(() => track(1, 'user_registered', { account_type: 'user' })).not.toThrow();
        expect(track(1, 'x')).toBeUndefined();
    });

    it('track() con distinctId null no lanza', () => {
        expect(() => track(null, 'x')).not.toThrow();
    });

    it('shutdownAnalytics() resuelve sin cliente', async () => {
        await expect(shutdownAnalytics()).resolves.toBeUndefined();
    });
});
