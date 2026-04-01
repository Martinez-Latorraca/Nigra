import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Report from './pages/Report';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import ChatWidget from './components/ChatWidget';
import Pet from './pages/Pet';
import io from 'socket.io-client';
import NotificationToast from './components/NotificationToast';
import { useEffect, useRef, useState } from 'react';
import { fetchInbox } from './store/inboxSlice';
import { useDispatch, useSelector } from 'react-redux';
import PetList from './pages/PetList';
import { ScrollToTop } from './helpers/ScrollToTop';

function App() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.data);
  const token = useSelector((state) => state.user?.token);



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

  // Inbox: se carga cuando tenemos usuario Y socket conectado
  useEffect(() => {
    if (token && user) {
      dispatch(fetchInbox());
    }
  }, [token, user, dispatch]);

  // Notificaciones en tiempo real
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleNewNotification = () => {
      dispatch(fetchInbox());
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, user?.id, dispatch]);

  return (
    <div className="min-h-screen bg-pet-light font-sans flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path='/pets' element={<PetList />} />
          <Route path="/profile" element={<Profile socket={socket} />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/reportar" element={<Report />} />
          <Route path="/pet/:id" element={<Pet socket={socket} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        <ChatWidget socket={socket} />
        <NotificationToast socket={socket} />
      </main>
    </div>
  );
}

export default App;