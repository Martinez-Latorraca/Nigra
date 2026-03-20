import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Report from './pages/Report';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import ChatWidget from './components/chatWidget';
import io from 'socket.io-client';
import NotificationToast from './components/NotificationToast';
import { useEffect } from 'react';

const socket = io("http://localhost:3000");
function App() {

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('petFinderUser'));
    if (user?.id) {
      // Le avisamos al servidor que este socket pertenece a este usuario
      socket.emit('register_user', user.id);
    }
  }, [socket]);

  
  return (

    <div className="min-h-screen bg-pet-light font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/reportar" element={<Report />} />
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