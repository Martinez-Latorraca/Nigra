import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, token: null },
  reducers: {
    setCredentials(state, action) {
      state.data = action.payload.user;
      state.token = action.payload.token;
    },
    // Merge parcial sobre el usuario, sin tocar el token. Lo usa la pantalla
    // de tipo de cuenta post-login social para reflejar has_vet/has_shelter
    // sin obligar a un re-login.
    updateUser(state, action) {
      if (state.data) state.data = { ...state.data, ...action.payload };
    },
    clearCredentials(state) {
      state.data = null;
      state.token = null;
    },
  },
});

export const { setCredentials, updateUser, clearCredentials } = userSlice.actions;
export default userSlice.reducer;
