import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchNotifications = createAsyncThunk(
    'notifications/fetch',
    async (_, { getState }) => {
        const token = getState().user?.token;
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al traer notificaciones');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }
);

export const markNotificationRead = createAsyncThunk(
    'notifications/markRead',
    async (id, { getState }) => {
        const token = getState().user?.token;
        await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return id;
    }
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState: {
        list: [],
        status: 'idle',
    },
    reducers: {
        prependNotification: (state, action) => {
            if (state.list.some(n => n.id === action.payload.id)) return;
            state.list.unshift(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.list = action.payload;
                state.status = 'succeeded';
            })
            .addCase(markNotificationRead.fulfilled, (state, action) => {
                const n = state.list.find(x => x.id === action.payload);
                if (n && !n.read_at) n.read_at = new Date().toISOString();
            });
    }
});

export const { prependNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
