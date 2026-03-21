import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
    name: "user",
    initialState: {
        data: null,
        token: null,
    },
    reducers: {
        setCredentials(state, action) {
            state.data = action.payload.user;
            state.token = action.payload.token;
        },
        clearCredentials: (state) => {
            state.data = null;
            state.token = null;
        },
        updateUserData(state, action) {
            if (state.data) {
                state.data.phone = action.payload.phone;
                state.data.address = action.payload.address;
            }
        },
    },
});

const { actions, reducer } = userSlice;
export const { setCredentials, clearCredentials, updateUserData } = actions;
export default reducer;
