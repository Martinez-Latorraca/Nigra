import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, token: null },
  reducers: {
    setCredentials(state, action) {
      state.data = action.payload.user;
      state.token = action.payload.token;
    },
    clearCredentials(state) {
      state.data = null;
      state.token = null;
    },
  },
});

export const { setCredentials, clearCredentials } = userSlice.actions;
export default userSlice.reducer;
