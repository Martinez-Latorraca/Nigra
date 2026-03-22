import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { markAsReadLocal } from './inboxSlice';

// Thunk para traer el historial de una mascota específica entre dos usuarios
export const fetchChatHistory = createAsyncThunk(
    'chat/fetchChatHistory',
    async ({ pet_id, otherUserId }, { getState, rejectWithValue }) => {
        try {
            const token = getState().user.token;
            const response = await fetch(`http://localhost:3000/api/messages/${pet_id}/${otherUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al traer el historial');

            const data = await response.json();

            // 🔥 NORMALIZACIÓN: Aseguramos que los IDs sean números y camelloCase
            return data.map(m => ({
                ...m,
                sender_id: Number(m.sender_id),
                receiver_id: Number(m.receiver_id),
                pet_id: Number(m.pet_id)
            }));
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const openChat = createAsyncThunk(
    'chat/openChatSession',
    async (petData, { dispatch, getState }) => {

        // A. Abrimos la UI al instante (Optimistic Update)
        dispatch(setChatActive(petData));

        // B. Apagamos la luz verde de notificaciones globalmente
        dispatch(markAsReadLocal(petData.pet_id));

        // C. Sincronizamos en segundo plano con PostgreSQL
        const token = getState().user.token;
        try {
            await fetch(`http://localhost:3000/api/messages/${petData.pet_id}/messages/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("No se pudo avisar a la DB:", error);
        }
    }
);

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        activeChat: [],
        activePet: null,
        isOpen: false,
        loading: false,
        error: null
    },
    reducers: {
        setChatActive: (state, action) => {
            state.activePet = action.payload;
            state.isOpen = true;
            state.activeChat = []; // Limpiamos el chat para cargar el nuevo historial
        },
        closeChat: (state) => {
            state.isOpen = false;
            state.activePet = null;
            state.activeChat = [];
        },
        receiveMessage: (state, action) => {
            if (state.activePet && Number(state.activePet.pet_id) === Number(action.payload.pet_id)) {
                state.activeChat.push(action.payload);
            }
        },
        // Limpiar el chat al cerrar la ventana

    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchChatHistory.pending, (state) => { state.loading = true; })
            .addCase(fetchChatHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.activeChat = action.payload;
            })
            .addCase(fetchChatHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { setChatActive, closeChat, receiveMessage } = chatSlice.actions;
export default chatSlice.reducer;