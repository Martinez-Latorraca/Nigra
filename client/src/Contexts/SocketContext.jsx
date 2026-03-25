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
            // 1. Si hay usuario, conectamos con el token en el handshake
            const newSocket = io(import.meta.env.VITE_API_URL, {
                auth: { token },
                transports: ['websocket'] // Forzamos websocket para Render
            });

            setSocket(newSocket);

            // Limpieza al desmontar o desloguear
            return () => newSocket.close();
        } else {
            // 2. Si no hay usuario (logout), cerramos el socket si existía
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [user, token]); // <--- Se dispara cada vez que el login cambia

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);