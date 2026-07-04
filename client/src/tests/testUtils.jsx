import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import userReducer from '../store/userSlice';
import inboxReducer from '../store/inboxSlice';
import notificationsReducer from '../store/notificationsSlice';
import chatReducer from '../store/chatSlice';

// Wrapper para tests: React Router + Redux con estado inicial configurable.
// Usado por component tests que dependen de useSelector, useNavigate o <Link>.
export function renderWithProviders(ui, { preloadedState = {}, route = '/' } = {}) {
    const store = configureStore({
        reducer: {
            user: userReducer,
            inbox: inboxReducer,
            notifications: notificationsReducer,
            chats: chatReducer,
        },
        preloadedState,
    });

    const Wrapper = ({ children }) => (
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </Provider>
    );

    return { store, ...render(ui, { wrapper: Wrapper }) };
}
