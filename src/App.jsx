import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
// Login/Register removed in offline mode
import Dashboard from './components/Dashboard';
import AddVideo from './components/AddVideo';
import PlaylistView from './components/PlaylistView';
import PlaylistSummaryView from './components/PlaylistSummaryView';
import VideoPlayerPage from './components/VideoPlayerPage';
import Trivia from './components/Trivia';
import TriviaVideoPage from './components/TriviaVideoPage';
import SummaryView from './components/SummaryView';
import CreatePlaylist from './components/CreatePlaylist';
import EngagementMonitor from './components/EngagementMonitor';
import MyAccount from './components/MyAccount';
import GroupsPage from './components/GroupsPage';
import OnnxModelPreloader from './components/OnnxModelPreloader';
import './styles/App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// PrivateRoute not needed in offline mode

function App() {
  return (
    <HashRouter>
      {/* Preload ONNX model when app starts */}
      <OnnxModelPreloader />
      
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-video" element={<AddVideo />} />
        <Route path="/create-playlist" element={<CreatePlaylist />} />
        <Route path="/playlist/:playlistId" element={<PlaylistView />} />
        <Route path="/playlist/:playlistId/summaries" element={<PlaylistSummaryView />} />
        <Route path="/playlist/:playlistId/video/:videoId" element={<VideoPlayerPage />} />
        <Route path="/trivia" element={<Trivia />} />        
        <Route path="/trivia/:videoId" element={<TriviaVideoPage />} />
        <Route path="/trivia/:videoId/summary" element={<SummaryView />} />
        <Route path="/engagement-monitor" element={<EngagementMonitor />} />
        <Route path="/my-account" element={<MyAccount />} />
        <Route path="/groups" element={<GroupsPage />} />
      </Routes>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </HashRouter>
  );
}

export default App;