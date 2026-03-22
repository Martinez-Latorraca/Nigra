// src/store/inboxSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';


// 📡 Acción Asíncrona: Redux va al backend a buscar la bandeja
export const fetchInbox = createAsyncThunk('inbox/fetchInbox', async (_, { getState }) => {
    const rootState = getState();
    const token = rootState.user?.token;

    const response = await fetch('http://localhost:3000/api/messages/inbox', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Error al traer mensajes");

    const data = await response.json();

    return data
});

const inboxSlice = createSlice({
    name: 'inbox',
    initialState: {
        messages: [],
        unreadCount: 0,
        status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
        activeChatId: null
    },
    reducers: {
        setActiveChatInbox: (state, action) => {
            state.activeChatId = action.payload;
        },
        // ✨ Acción Síncrona: Apaga el punto verde al instante al hacer clic
        markAsReadLocal: (state, action) => {
            const pet_id = action.payload;
            const msg = state.messages.find(m => m.pet_id === pet_id);
            if (msg && !msg.is_read) {
                msg.is_read = true;
            }
        }
    },
    extraReducers: (builder) => {
        builder.addCase(fetchInbox.fulfilled, (state, action) => {


            // 1. Extraemos lo que nos mandó el Thunk
            const messages = action.payload;

            // 2. Procesamos los mensajes
            const processedMessages = messages.map(msg => {
                if (msg.pet_id === state.activeChatId) {
                    return { ...msg, is_read: true };
                }
                return msg;
            });

            state.messages = processedMessages;

            state.status = 'succeeded';
        });
    }
});

export const { markAsReadLocal, setActiveChatInbox } = inboxSlice.actions;
export default inboxSlice.reducer;