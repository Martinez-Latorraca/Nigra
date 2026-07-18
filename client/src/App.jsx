import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Find from './pages/Find';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import ChatWidget from './components/ChatWidget';
import Pet from './pages/Pet';
import io from 'socket.io-client';
import NotificationToast from './components/NotificationToast';
import { useEffect, useRef, useState } from 'react';
import { fetchInbox } from './store/inboxSlice';
import { fetchNotifications, prependNotification } from './store/notificationsSlice';
import { useDispatch, useSelector } from 'react-redux';
import PetList from './pages/PetList';
import AdminPanel from './pages/AdminPanel';
import Vets from './pages/Vets';
import VetProfile from './pages/VetProfile';
import { ScrollToTop } from './helpers/ScrollToTop';

function App() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.data);
  const token = useSelector((state) => state.user?.token);
  const location = useLocation();
  // La landing es standalone: sin navbar, sin chat widget, sin toasts.
  const isLanding = location.pathname === '/';



  // useRef para que el socket persista entre renders sin ser una variable de módulo
  const socketRef = useRef(null);
  // Estado para forzar re-render de los hijos cuando el socket esté listo
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Sin token no hacemos nada — el cleanup de la ejecución anterior
    // ya se encargó de llamar setSocket(null) y desconectar
    if (!token) return;

    // Si ya hay un socket conectado con este token, no hacemos nada
    if (socketRef.current?.connected) return;

    // Si había un socket viejo (sesión anterior), lo limpiamos
    if (socketRef.current) socketRef.current.disconnect();

    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    // setSocket solo se llama desde callbacks, no del cuerpo del effect
    newSocket.on('connect', () => {
      console.log('✅ Socket conectado:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Error de conexión:', err.message);
    });

    socketRef.current = newSocket;

    // Cuando token cambia o el componente se desmonta:
    // 1. Se desconecta el socket
    // 2. setSocket(null) avisa a los hijos que no hay socket
    return () => {
      newSocket.off('connect');
      newSocket.off('connect_error');
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null); // en cleanup está permitido
    };
  }, [token]);

  // Inbox + notifications: se cargan cuando tenemos usuario logueado
  useEffect(() => {
    if (token && user) {
      dispatch(fetchInbox());
      dispatch(fetchNotifications());
    }
  }, [token, user, dispatch]);

  // Notificaciones en tiempo real
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleNewNotification = () => {
      dispatch(fetchInbox());
    };

    const handleNewMatch = (notif) => {
      dispatch(prependNotification(notif));
    };

    // Al cerrarse/reabrirse un caso el server ya marcó los messages como
    // leídos (o los reactivó). Refrescamos el inbox para que el badge de
    // no-leídos se sincronice.
    const handlePetResolvedOrReopened = () => {
      dispatch(fetchInbox());
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('new_match_notification', handleNewMatch);
    socket.on('pet_resolved', handlePetResolvedOrReopened);
    socket.on('pet_reopened', handlePetResolvedOrReopened);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('new_match_notification', handleNewMatch);
      socket.off('pet_resolved', handlePetResolvedOrReopened);
      socket.off('pet_reopened', handlePetResolvedOrReopened);
    };
  }, [socket, user?.id, dispatch]);

  return (
    <div className="min-h-screen bg-pet-light font-sans flex flex-col">
      <ScrollToTop />
      {!isLanding && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Home />} />
          <Route path='/pets' element={<PetList />} />
          <Route path="/profile" element={<Profile socket={socket} />} />
          <Route path="/buscar" element={<Find />} />
          <Route path="/reportar" element={<Find />} />
          <Route path="/pet/:id" element={<Pet socket={socket} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/vets" element={<Vets />} />
          <Route path="/vets/:slug" element={<VetProfile />} />
        </Routes>
        {!isLanding && <ChatWidget socket={socket} />}
        {!isLanding && <NotificationToast socket={socket} />}
      </main>
    </div>
  );
}

export default App;