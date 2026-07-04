import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import donationReducer, {
    markDismissedTemp,
    markDismissedPermanent,
    resetDismissal,
    selectDonationVisible,
} from './donationSlice';

const buildStore = () => configureStore({ reducer: { donation: donationReducer } });

describe('donationSlice (web)', () => {
    afterEach(() => vi.useRealTimers());

    describe('estado inicial + reducers', () => {
        it('inicial: dismissed vacío', () => {
            const store = buildStore();
            expect(store.getState().donation.dismissed).toEqual({});
        });

        it('markDismissedTemp guarda at + permanent=false', () => {
            const store = buildStore();
            store.dispatch(markDismissedTemp(42));
            const entry = store.getState().donation.dismissed['42'];
            expect(entry.permanent).toBe(false);
            expect(new Date(entry.at).getTime()).toBeGreaterThan(0);
        });

        it('markDismissedPermanent guarda permanent=true', () => {
            const store = buildStore();
            store.dispatch(markDismissedPermanent(42));
            expect(store.getState().donation.dismissed['42'].permanent).toBe(true);
        });

        it('resetDismissal borra la entrada (útil al reabrir un reporte)', () => {
            const store = buildStore();
            store.dispatch(markDismissedPermanent(42));
            store.dispatch(resetDismissal(42));
            expect(store.getState().donation.dismissed['42']).toBeUndefined();
        });

        it('petId se normaliza a string (dispatch con number funciona igual)', () => {
            const store = buildStore();
            store.dispatch(markDismissedTemp(7));
            expect(store.getState().donation.dismissed['7']).toBeDefined();
        });
    });

    describe('selectDonationVisible', () => {
        it('true si nunca fue dismissado', () => {
            const store = buildStore();
            expect(selectDonationVisible(42)(store.getState())).toBe(true);
        });

        it('false si dismissed permanent', () => {
            const store = buildStore();
            store.dispatch(markDismissedPermanent(42));
            expect(selectDonationVisible(42)(store.getState())).toBe(false);
        });

        it('false si dismissed temp hace menos de 7 días', () => {
            const store = buildStore();
            store.dispatch(markDismissedTemp(42));
            expect(selectDonationVisible(42)(store.getState())).toBe(false);
        });

        it('vuelve a aparecer después de 7 días desde el dismiss temp', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
            const store = buildStore();
            store.dispatch(markDismissedTemp(42));

            // 6 días después → sigue oculto
            vi.setSystemTime(new Date('2026-07-07T00:00:00Z'));
            expect(selectDonationVisible(42)(store.getState())).toBe(false);

            // 8 días después → vuelve
            vi.setSystemTime(new Date('2026-07-09T00:00:00Z'));
            expect(selectDonationVisible(42)(store.getState())).toBe(true);
        });

        it('permanent nunca vuelve, aunque pasen años', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
            const store = buildStore();
            store.dispatch(markDismissedPermanent(42));

            vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
            expect(selectDonationVisible(42)(store.getState())).toBe(false);
        });

        it('petId consistente entre number y string en el select', () => {
            const store = buildStore();
            store.dispatch(markDismissedPermanent('42'));
            expect(selectDonationVisible(42)(store.getState())).toBe(false);
        });
    });
});
