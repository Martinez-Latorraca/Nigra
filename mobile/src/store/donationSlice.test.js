import { describe, it, expect, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import donationReducer, {
    markDismissedTemp,
    markDismissedPermanent,
    resetDismissal,
    selectDonationVisible,
} from './donationSlice';

const buildStore = () => configureStore({ reducer: { donation: donationReducer } });

describe('donationSlice (mobile)', () => {
    afterEach(() => vi.useRealTimers());

    it('inicial: dismissed vacío, banner visible', () => {
        const store = buildStore();
        expect(store.getState().donation.dismissed).toEqual({});
        expect(selectDonationVisible(42)(store.getState())).toBe(true);
    });

    it('dismiss temp: banner oculto por 7 días, luego vuelve', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
        const store = buildStore();

        store.dispatch(markDismissedTemp(42));
        expect(selectDonationVisible(42)(store.getState())).toBe(false);

        vi.setSystemTime(new Date('2026-07-09T00:00:00Z'));
        expect(selectDonationVisible(42)(store.getState())).toBe(true);
    });

    it('dismiss permanent: banner oculto para siempre', () => {
        const store = buildStore();
        store.dispatch(markDismissedPermanent(42));
        expect(selectDonationVisible(42)(store.getState())).toBe(false);
    });

    it('resetDismissal reabre el banner (usado al reabrir un reporte)', () => {
        const store = buildStore();
        store.dispatch(markDismissedPermanent(42));
        store.dispatch(resetDismissal(42));
        expect(selectDonationVisible(42)(store.getState())).toBe(true);
    });

    it('petId consistente entre number y string', () => {
        const store = buildStore();
        store.dispatch(markDismissedPermanent(42));
        expect(selectDonationVisible('42')(store.getState())).toBe(false);
        expect(selectDonationVisible(42)(store.getState())).toBe(false);
    });
});
