import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { API_URL } from './config';
import api from './api';

const SocketContext = createContext({
  socket: null,
  inbox: [],
  notifications: [],
  unreadCount: 0,
  refreshInbox: () => {},
  refreshNotifications: () => {},
  markNotificationRead: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const token = useSelector((s) => s.user.token);
  const userId = useSelector((s) => s.user.data?.id);
  const [socket, setSocket] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const refreshInbox = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get('/api/messages/inbox');
      setInbox(Array.isArray(data) ? data : []);
    } catch {
      // silencioso
    }
  }, [token]);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silencioso
    }
  }, [token]);

  const markNotificationRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    try {
      await api.patch(`/api/notifications/${id}/read`);
    } catch {
      // si falla, el reintento es OK en el próximo refresh
    }
  }, []);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setInbox([]);
      setNotifications([]);
      return;
    }

    const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;
    s.on('connect', () => setSocket(s));
    s.on('new_notification', () => refreshInbox());
    s.on('new_match_notification', (notif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    });
    // Al cerrarse/reabrirse un caso, el server marcó los messages como leídos
    // (o los reactivó). Refrescamos el inbox para que la campanita se apague.
    s.on('pet_resolved', () => refreshInbox());
    s.on('pet_reopened', () => refreshInbox());
    refreshInbox();
    refreshNotifications();

    return () => {
      s.off();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token, refreshInbox, refreshNotifications]);

  const unreadChats = inbox.filter(
    (c) => !c.is_read && Number(c.receiver_id) === Number(userId)
  ).length;
  const unreadNotifs = notifications.filter((n) => !n.read_at).length;
  const unreadCount = unreadChats + unreadNotifs;

  return (
    <SocketContext.Provider
      value={{
        socket,
        inbox,
        notifications,
        unreadCount,
        refreshInbox,
        refreshNotifications,
        markNotificationRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
