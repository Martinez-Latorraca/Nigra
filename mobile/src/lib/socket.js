import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { API_URL } from './config';
import api from './api';

const SocketContext = createContext({
  socket: null,
  inbox: [],
  unreadCount: 0,
  refreshInbox: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const token = useSelector((s) => s.user.token);
  const userId = useSelector((s) => s.user.data?.id);
  const [socket, setSocket] = useState(null);
  const [inbox, setInbox] = useState([]);
  const socketRef = useRef(null);

  const refreshInbox = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get('/api/messages/inbox');
      setInbox(Array.isArray(data) ? data : []);
    } catch {
      // silencioso: el inbox es secundario
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setInbox([]);
      return;
    }

    const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;
    s.on('connect', () => setSocket(s));
    s.on('new_notification', () => refreshInbox());
    refreshInbox();

    return () => {
      s.off();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token, refreshInbox]);

  const unreadCount = inbox.filter(
    (c) => !c.is_read && Number(c.receiver_id) === Number(userId)
  ).length;

  return (
    <SocketContext.Provider value={{ socket, inbox, unreadCount, refreshInbox }}>
      {children}
    </SocketContext.Provider>
  );
}
