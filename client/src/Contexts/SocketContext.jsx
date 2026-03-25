// contexts/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // Asumo que tienes un AuthContext

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user, token } = useAuth(); // Obtenemos el user y el token del auth
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user && token) {
            // 1. Creamos la instancia (esto es síncrono, no dispara render)
            const newSocket = io(import.meta.env.VITE_API_URL, {
                auth: { token },
                transports: ['websocket']
            });

            // 2. ESCUCHAMOS el evento de conexión (Asíncrono)
            newSocket.on('connect', () => {
                console.log('Socket conectado con ID:', newSocket.id);
                setSocket(newSocket); // Ahora sí, el linter está feliz porque es un callback
            });

            // Manejo de errores (Opcional pero recomendado)
            newSocket.on('connect_error', (err) => {
                console.error('Error de conexión socket:', err.message);
            });

            // 3. Limpieza
            return () => {
                newSocket.off('connect');
                newSocket.off('connect_error');
                newSocket.disconnect();
                setSocket(null);
            };
        }
    }, [user, token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);