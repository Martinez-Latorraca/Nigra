import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Report from './pages/Report';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import ChatWidget from './components/chatWidget';
import Pet from './pages/Pet';
import io from 'socket.io-client';
import NotificationToast from './components/NotificationToast';
import { useEffect } from 'react';
import { fetchInbox } from './store/inboxSlice';
import { useDispatch, useSelector } from 'react-redux';
import PetList from './pages/PetList';

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket']
  ,
  autoConnect: false
});

function App() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user?.data);
  const token = useSelector((state) => state.user?.token);

  useEffect(() => {
    socket.auth = { token };
    socket.connect();

    // Debug: para que veas qué pasa en la consola
    socket.on('connect', () => console.log('✅ Socket conectado:', socket.id));
    socket.on('connect_error', (err) => console.error('❌ Error de conexión:', err.message));

    if (token && user) {
      dispatch(fetchInbox());
    }

  }, [socket, dispatch, token, user]);

  useEffect(() => {
    if (socket && user?.id) {

      const handleNewNotification = () => {

        dispatch(fetchInbox());
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket, dispatch, user?.id]);


  return (

    <div className="min-h-screen bg-pet-light font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path='/pets' element={<PetList />} />
          <Route path="/profile" element={<Profile socket={socket} />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/reportar" element={<Report />} />
          <Route path="/pet/:id" element={<Pet />} socket={socket} />
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