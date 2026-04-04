import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { markAsReadLocal } from './inboxSlice';

// Thunk para traer el historial de una mascota específica entre dos usuarios
export const fetchChatHistory = createAsyncThunk(
    'chat/fetchChatHistory',
    async ({ pet_id, otherUserId, page = 1 }, { getState, rejectWithValue }) => {
        try {
            const token = getState().user.token;
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/messages/${pet_id}/${otherUserId}?page=${page}&limit=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al traer el historial');

            const data = await response.json();

            const messages = data.messages.map(m => ({
                ...m,
                sender_id: Number(m.sender_id),
                receiver_id: Number(m.receiver_id),
                pet_id: Number(m.pet_id)
            }));

            return { messages, page: data.page, totalPages: data.totalPages };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const markChatAsRead = createAsyncThunk(
    'chat/markChatAsRead',
    async (_, { dispatch, getState }) => {
        const state = getState();
        const token = state.user.token;
        // Sacamos los datos de la mascota directamente del estado global de Redux
        const activePet = state.chats.activePet; // Ojo: asegúrate de usar el nombre correcto del reducer de store.js (chats o chat)

        if (!activePet) return;

        // 1. Apagamos la luz verde de notificaciones localmente en el inbox
        dispatch(markAsReadLocal({
            pet_id: activePet.pet_id,
            other_user_id: activePet.otherUserId
        }));

        // 2. Avisamos a PostgreSQL usando el nuevo endpoint
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/messages/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pet_id: activePet.pet_id,
                    other_user_id: activePet.otherUserId
                })
            });
        } catch (error) {
            console.error("No se pudo avisar a la DB sobre la lectura:", error);
        }
    }
);

export const openChat = createAsyncThunk(
    'chat/openChatSession',
    async (petData, { dispatch }) => {
        dispatch(setChatActive(petData));
       
        dispatch(markChatAsRead());
    }
);

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        activeChat: [],
        activePet: null,
        isOpen: false,
        loading: false,
        error: null,
        chatPage: 1,
        chatTotalPages: 1,
    },
    reducers: {
        setChatActive: (state, action) => {
            state.activePet = action.payload;
            state.isOpen = true;
            state.activeChat = [];
            state.chatPage = 1;
            state.chatTotalPages = 1;
        },
        closeChat: (state) => {
            state.isOpen = false;
            state.activePet = null;
            state.activeChat = [];
            state.chatPage = 1;
            state.chatTotalPages = 1;
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
                const { messages, page, totalPages } = action.payload;
                if (page === 1) {
                    state.activeChat = messages;
                } else {
                    // Mensajes anteriores van al principio
                    state.activeChat = [...messages, ...state.activeChat];
                }
                state.chatPage = page;
                state.chatTotalPages = totalPages;
            })
            .addCase(fetchChatHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { setChatActive, closeChat, receiveMessage } = chatSlice.actions;
export default chatSlice.reducer;