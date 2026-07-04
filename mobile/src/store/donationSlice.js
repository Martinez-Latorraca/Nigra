import { createSlice } from '@reduxjs/toolkit';

// Estado del banner de donación por mascota. Persistido en AsyncStorage
// para que el dismiss sobreviva a cierres de la app.
// dismissed[pet_id] = { at: ISO, permanent: bool }
//   - permanent=true → "Ya doné", nunca más se muestra.
//   - permanent=false → "Ahora no", vuelve a aparecer después de X días.
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
            // Se llama cuando el reporte se reabre — el banner queda limpio.
            const petId = String(action.payload);
            delete state.dismissed[petId];
        },
    },
});

export const { markDismissedTemp, markDismissedPermanent, resetDismissal } = donationSlice.actions;

// Selector: ¿mostramos el banner para esta mascota?
export const selectDonationVisible = (petId) => (state) => {
    const entry = state.donation?.dismissed?.[String(petId)];
    if (!entry) return true;
    if (entry.permanent) return false;
    const daysSince = (Date.now() - new Date(entry.at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > RESURFACE_DAYS;
};

export default donationSlice.reducer;
