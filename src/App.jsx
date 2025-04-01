import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddVideo from './components/AddVideo';
import PlaylistView from './components/PlaylistView';
import Trivia from './components/Trivia';
import TriviaVideoPage from './components/TriviaVideoPage';
import './styles/App.css';

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
      </Routes>
    </HashRouter>
  );
}

export default App;