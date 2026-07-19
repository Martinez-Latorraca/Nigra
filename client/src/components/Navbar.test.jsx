import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../tests/testUtils';
import Navbar from './Navbar';

describe('<Navbar />', () => {
    it('sin token: muestra "Iniciar Sesión" y el wordmark mimo', () => {
        renderWithProviders(<Navbar />, {
            preloadedState: {
                user: { token: null, data: null },
                inbox: { messages: [], activeChatId: null, status: 'idle' },
                notifications: { list: [], status: 'idle' },
            },
        });

        expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
        expect(screen.queryByText('Mi Perfil')).not.toBeInTheDocument();
        // El wordmark es un SVG (no un nodo de texto). Lo identificamos por aria-label.
        expect(screen.getByLabelText('mimo')).toBeInTheDocument();
    });

    it('con token: muestra "Mi Perfil" y esconde "Iniciar Sesión"', () => {
        renderWithProviders(<Navbar />, {
            preloadedState: {
                user: { token: 't', data: { id: 7, name: 'Ana', role: 'user' } },
                inbox: { messages: [], activeChatId: null, status: 'idle' },
                notifications: { list: [], status: 'idle' },
            },
        });

        expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
        expect(screen.queryByText('Iniciar Sesión')).not.toBeInTheDocument();
    });

    it('admin: muestra el link "Admin"', () => {
        renderWithProviders(<Navbar />, {
            preloadedState: {
                user: { token: 't', data: { id: 1, name: 'Root', role: 'admin' } },
                inbox: { messages: [], activeChatId: null, status: 'idle' },
                notifications: { list: [], status: 'idle' },
            },
        });

        expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('user no-admin no ve link "Admin"', () => {
        renderWithProviders(<Navbar />, {
            preloadedState: {
                user: { token: 't', data: { id: 7, name: 'Ana', role: 'user' } },
                inbox: { messages: [], activeChatId: null, status: 'idle' },
                notifications: { list: [], status: 'idle' },
            },
        });

        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    describe('badge de mensajes sin leer', () => {
        const userState = { token: 't', data: { id: 7, name: 'Ana', role: 'user' } };

        it('NO muestra el ping si no hay mensajes sin leer para mí', () => {
            const { container } = renderWithProviders(<Navbar />, {
                preloadedState: {
                    user: userState,
                    inbox: {
                        messages: [
                            // sin leer pero es de otro receptor
                            { pet_id: 1, is_read: false, receiver_id: 99 },
                            // dirigido a mí pero leído
                            { pet_id: 2, is_read: true, receiver_id: 7 },
                        ],
                        activeChatId: null, status: 'idle',
                    },
                    notifications: { list: [], status: 'idle' },
                },
            });
            expect(container.querySelector('.animate-ping')).toBeNull();
        });

        it('muestra el ping si hay al menos uno sin leer dirigido a mí', () => {
            const { container } = renderWithProviders(<Navbar />, {
                preloadedState: {
                    user: userState,
                    inbox: {
                        messages: [
                            { pet_id: 1, is_read: false, receiver_id: 7 },
                            { pet_id: 2, is_read: true, receiver_id: 7 },
                        ],
                        activeChatId: null, status: 'idle',
                    },
                    notifications: { list: [], status: 'idle' },
                },
            });
            expect(container.querySelector('.animate-ping')).not.toBeNull();
        });
    });
});
