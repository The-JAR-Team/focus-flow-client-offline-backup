import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import EyeDebugger from './EyeDebugger';
import '../styles/Dashboard.css';
import StackedThumbnails from './StackedThumbnails';
import Spinner from './Spinner';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedPlaylist } from '../redux/playlistSlice';
import { setDashboardData } from '../redux/dashboardSlice';
import { initializeDashboardData } from '../services/dashboardService';

function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [eyeDebuggerOn, setEyeDebuggerOn] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'pause');
  const [error, setError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    myPlaylists: true,
    publicPlaylists: true,
    myVideos: true,
    publicVideos: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get data from Redux store instead of local state
  const { currentUser } = useSelector(state => state.user);
  const {
    myGenericVideos,
    otherGenericVideos,
    myPlaylists,
    otherPlaylists,
    isLoaded
  } = useSelector(state => state.dashboard);

  useEffect(() => {
    setTimeout(() => setEyeDebuggerOn(false), 5000);
  }, []);

  useEffect(() => {
    if (selectedVideo) {
      console.log("[DEBUG] Attempting to load video:", selectedVideo.external_id, selectedVideo.subject);
    }
  }, [selectedVideo]);

  const handlePlaylistClick = (playlist) => {
    dispatch(setSelectedPlaylist(playlist));
    navigate(`/playlist/${playlist.playlist_id}`);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  const refreshDashboard = async (e) => {
    const dashboardData = await initializeDashboardData(currentUser);

    dispatch(setDashboardData({
      myGenericVideos: dashboardData.myGenericVideos,
      otherGenericVideos: dashboardData.otherGenericVideos,
      myPlaylists: dashboardData.myPlaylists,
      otherPlaylists: dashboardData.otherPlaylists
    }));
  }

  const groups = ['All Lectures', ...new Set(videos.map(v => v.group))];
  const filteredVideos = selectedGroup === 'All Lectures'
    ? videos
    : videos.filter(v => v.group === selectedGroup);

  if (!isLoaded) {
    return (
      <div className="loading-overlay">
        <Spinner size="large" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        {currentUser ? (
          <>
            <div className="user-greeting">
              <h1>Hello {currentUser.first_name} {currentUser.last_name}</h1>
            </div>
            <button className="back-button" onClick={() => refreshDashboard()}>
              Refresh Dashboard
            </button>
          </>
        ) : (
          <div className="login-prompt">
            <p>{error || 'No user logged in.'}</p>
            <p>
              Please <button onClick={() => navigate('/')}>Log in</button> or <button onClick={() => navigate('/register')}>Register</button>.
            </p>
          </div>
        )}
        {!selectedVideo ? (
          <>
            <div className="controls-row">
              <div className="mode-selector">
                <button
                  className={`mode-button ${mode === 'pause' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('pause');
                    localStorage.setItem('mode', 'pause');
                  }}
                >
                  Pause Mode
                </button>
                <button
                  className={`mode-button ${mode === 'question' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('question');
                    localStorage.setItem('mode', 'question');
                  }}
                >
                  Question Mode
                </button>
              </div>
            </div>
            
            {/* My Playlists Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('myPlaylists')} className="collapsible-header">
                  My Playlists
                  <span className={`arrow ${expandedSections.myPlaylists ? 'expanded' : ''}`}>▼</span>
                </h2>
              </div>
              <div className={`collapsible-content ${expandedSections.myPlaylists ? 'expanded' : ''}`}>
                <div className="content-grid">
                  {myPlaylists.map(playlist => (
                    <div 
                      className="playlist-card" 
                      key={playlist.playlist_id}
                      onClick={() => handlePlaylistClick(playlist)}
                    >
                      <h4>{playlist.playlist_name}</h4>
                      <StackedThumbnails videos={playlist.playlist_items} />
                      <div className="playlist-info">
                        <p>Permission: {playlist.playlist_permission}</p>
                        <p>Videos: {playlist.playlist_items.length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Public Playlists Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('publicPlaylists')} className="collapsible-header">
                  Public Playlists
                  <span className={`arrow ${expandedSections.publicPlaylists ? 'expanded' : ''}`}>▼</span>
                </h2>
              </div>
              <div className={`collapsible-content ${expandedSections.publicPlaylists ? 'expanded' : ''}`}>
                <div className="content-grid">
                  {otherPlaylists.map(playlist => (
                    <div 
                      className="playlist-card" 
                      key={playlist.playlist_id}
                      onClick={() => handlePlaylistClick(playlist)}
                    >
                      <h4>{playlist.playlist_name}</h4>
                      <StackedThumbnails videos={playlist.playlist_items} />
                      <div className="playlist-info">
                        <p>Owner: {playlist.playlist_owner_name}</p>
                        <p>Permission: {playlist.playlist_permission}</p>
                        <p>Videos: {playlist.playlist_items.length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* My Videos Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('myVideos')} className="collapsible-header">
                  My Videos
                  <span className={`arrow ${expandedSections.myVideos ? 'expanded' : ''}`}>▼</span>
                </h2>
              </div>
              <div className={`collapsible-content ${expandedSections.myVideos ? 'expanded' : ''}`}>
                <div className="content-grid">
                  {myGenericVideos.map(video => (
                    <div className="video-card" key={video.video_id} onClick={() => handleVideoSelect(video)}>
                      <h4>{video.video_name}</h4>
                      <img src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`} alt={video.group} />
                      <div className="video-info">
                        <h5>Subject: {video.group}</h5>
                        <small>Length: {video.length}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Public Videos Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('publicVideos')} className="collapsible-header">
                  Public Videos
                  <span className={`arrow ${expandedSections.publicVideos ? 'expanded' : ''}`}>▼</span>
                </h2>
              </div>
              <div className={`collapsible-content ${expandedSections.publicVideos ? 'expanded' : ''}`}>
                <div className="content-grid">
                  {otherGenericVideos.map(video => (
                    <div className="video-card" key={video.video_id} onClick={() => handleVideoSelect(video)}>
                      <h4>{video.video_name}</h4>
                      <img src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`} alt={video.group} />
                      <div className="video-info">
                        <h5>Subject: {video.group}</h5>
                        <small>Uploaded by: {video.uploadby}</small><br />
                        <small>Length: {video.length}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setSelectedVideo(null)}>
              ← Back to Lectures
            </button>
            <VideoPlayer 
              mode={mode}
              lectureInfo={{
                videoId: selectedVideo.external_id,
                subject: selectedVideo.subject,
                videoDuration: selectedVideo.length,
              }}
                userInfo={{ name: `${currentUser.first_name} ${currentUser.last_name}`, profile: currentUser.profile }}
            />
          </>
        )}
      </div>
      <EyeDebugger enabled={eyeDebuggerOn} />
    </div>
  );
}

export default Dashboard;
