import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../tests/testUtils';
import NotificationToast from './NotificationToast';

// Fake socket: registra handlers y permite disparar eventos desde el test.
const makeFakeSocket = () => {
    const handlers = {};
    return {
        on: vi.fn((event, cb) => { handlers[event] = cb; }),
        off: vi.fn((event) => { delete handlers[event]; }),
        _emit: (event, data) => handlers[event]?.(data),
    };
};

describe('<NotificationToast />', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('no renderiza nada mientras no llegue evento', () => {
        const socket = makeFakeSocket();
        const { container } = renderWithProviders(<NotificationToast socket={socket} />);
        expect(container.firstChild).toBeNull();
    });

    it('sin socket: no revienta ni renderiza', () => {
        const { container } = renderWithProviders(<NotificationToast socket={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('new_notification (chat) muestra banner con senderName + contenido', () => {
        const socket = makeFakeSocket();
        renderWithProviders(<NotificationToast socket={socket} />);

        act(() => {
            socket._emit('new_notification', {
                pet_id: 1,
                senderName: 'Ana',
                content: 'Hola, vi tu perro',
                petPhoto: 'https://x.com/p.jpg',
                sender_id: 2,
            });
        });

        expect(screen.getByText(/Ana te escribió/i)).toBeInTheDocument();
        expect(screen.getByText('Hola, vi tu perro')).toBeInTheDocument();
    });

    it('new_match_notification muestra banner de match con el nombre', () => {
        const socket = makeFakeSocket();
        renderWithProviders(<NotificationToast socket={socket} />);

        act(() => {
            socket._emit('new_match_notification', {
                id: 42,
                data: { pet_id: 5, photo_url: 'p', match_name: 'Rocky' },
            });
        });

        expect(screen.getByText(/Posible coincidencia/i)).toBeInTheDocument();
        expect(screen.getByText(/similar a Rocky/i)).toBeInTheDocument();
    });

    it('suprime el banner de match si ya estoy en /pet/:id de ese pet', () => {
        const socket = makeFakeSocket();
        const { container } = renderWithProviders(
            <NotificationToast socket={socket} />,
            { route: '/pet/5' }
        );

        act(() => {
            socket._emit('new_match_notification', {
                id: 42,
                data: { pet_id: 5, photo_url: 'p' },
            });
        });

        expect(container.firstChild).toBeNull();
    });

    it('auto-dismiss después de 5s', () => {
        const socket = makeFakeSocket();
        renderWithProviders(<NotificationToast socket={socket} />);

        act(() => {
            socket._emit('new_notification', {
                pet_id: 1, senderName: 'Ana', content: 'x',
                petPhoto: '', sender_id: 2,
            });
        });
        expect(screen.getByText(/Ana te escribió/i)).toBeInTheDocument();

        act(() => vi.advanceTimersByTime(5100));
        expect(screen.queryByText(/Ana te escribió/i)).not.toBeInTheDocument();
    });

    it('botón de close (X) cierra el banner sin navegar', () => {
        const socket = makeFakeSocket();
        renderWithProviders(<NotificationToast socket={socket} />);

        act(() => {
            socket._emit('new_notification', {
                pet_id: 1, senderName: 'Ana', content: 'x',
                petPhoto: '', sender_id: 2,
            });
        });

        const closeBtn = screen.getByLabelText('Cerrar');
        fireEvent.click(closeBtn);
        expect(screen.queryByText(/Ana te escribió/i)).not.toBeInTheDocument();
    });
});
