import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddVideo from './components/AddVideo';
import PlaylistView from './components/PlaylistView';
import Trivia from './components/Trivia';
import TriviaVideoPage from './components/TriviaVideoPage';
import SummaryView from './components/SummaryView';
import CreatePlaylist from './components/CreatePlaylist';
import EngagementMonitor from './components/EngagementMonitor';
import './styles/App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/add-video" element={<PrivateRoute><AddVideo /></PrivateRoute>} />
        <Route path="/create-playlist" element={<PrivateRoute><CreatePlaylist /></PrivateRoute>} />
        <Route path="/playlist/:playlistId" element={<PrivateRoute><PlaylistView /></PrivateRoute>} />        <Route path="/trivia" element={<PrivateRoute><Trivia /></PrivateRoute>} />
        <Route path="/trivia/:videoId" element={<PrivateRoute><TriviaVideoPage /></PrivateRoute>} />
        <Route path="/trivia/:videoId/summary" element={<PrivateRoute><SummaryView /></PrivateRoute>} />
        <Route path="/engagement-monitor" element={<PrivateRoute><EngagementMonitor /></PrivateRoute>} />
      </Routes>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </HashRouter>
  );
}

export default App;