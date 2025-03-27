import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddVideo from './components/AddVideo';
import PlaylistView from './components/PlaylistView';
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
      </Routes>
    </HashRouter>
  );
}

export default App;