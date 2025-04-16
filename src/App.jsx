import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddVideo from './components/AddVideo';
import PlaylistView from './components/PlaylistView';
import Trivia from './components/Trivia';
import TriviaVideoPage from './components/TriviaVideoPage';
import EditPlaylist from './components/EditPlaylist';
import './styles/App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-video" element={<AddVideo />} />
        <Route path="/playlist/:playlistId" element={<PlaylistView />} />
        <Route path="/trivia" element={<Trivia />} />
        <Route path="/trivia/:videoId" element={<TriviaVideoPage />} />
        <Route path="/edit-playlist/:playlistId" element={<EditPlaylist />} />
      </Routes>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </HashRouter>
  );
}

export default App;