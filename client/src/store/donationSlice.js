import { createSlice } from '@reduxjs/toolkit';

// Idem mobile: banner de donación por mascota, persistido para que el
// dismiss sobreviva a recargas.
const RESURFACE_DAYS = 7;

const donationSlice = createSlice({
    name: 'donation',
    initialState: { dismissed: {} },
    reducers: {
        markDismissedTemp(state, action) {
            const petId = String(action.payload);
            state.dismissed[petId] = { at: new Date().toISOString(), permanent: false };
        },
        markDismissedPermanent(state, action) {
            const petId = String(action.payload);
            state.dismissed[petId] = { at: new Date().toISOString(), permanent: true };
        },
        resetDismissal(state, action) {
            const petId = String(action.payload);
            delete state.dismissed[petId];
        },
    },
});

export const { markDismissedTemp, markDismissedPermanent, resetDismissal } = donationSlice.actions;

export const selectDonationVisible = (petId) => (state) => {
    const entry = state.donation?.dismissed?.[String(petId)];
    if (!entry) return true;
    if (entry.permanent) return false;
    const daysSince = (Date.now() - new Date(entry.at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > RESURFACE_DAYS;
};

export default donationSlice.reducer;
