import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import EyeDebugger from './EyeDebugger';
import '../styles/Dashboard.css';
import { logoutUser } from '../services/api';
import { initializeDashboardData } from '../services/dashboardService';
import StackedThumbnails from './StackedThumbnails';

function Dashboard() {
  const navigate = useNavigate();
  const [eyeDebuggerOn, setEyeDebuggerOn] = useState(false);
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [mode, setMode] = useState('pause');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [otherPlaylists, setOtherPlaylists] = useState([]);
  const [myGenericVideos, setMyGenericVideos] = useState([]);
  const [otherGenericVideos, setOtherGenericVideos] = useState([]);

  useEffect(() => {
    setMode('pause');
    const loadDashboard = async () => {
      try {
        const {
          userData,
          myGenericVideos,
          otherGenericVideos,
          myPlaylists,
          otherPlaylists
        } = await initializeDashboardData();

        setUser(userData);
        setMyGenericVideos(myGenericVideos);
        setOtherGenericVideos(otherGenericVideos);
        setMyPlaylists(myPlaylists);
        setOtherPlaylists(otherPlaylists);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setError('Failed to load content');
      }
    };

    loadDashboard();
    setTimeout(() => setEyeDebuggerOn(true), 5000);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      navigate('/'); // redirect to base page
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handlePlaylistClick = (playlist) => {
    // Store playlist data temporarily in localStorage
    localStorage.setItem('selectedPlaylist', JSON.stringify(playlist));
    navigate(`/playlist/${playlist.playlist_id}`);
  };

  const groups = ['All Lectures', ...new Set(videos.map(v => v.group))];
  const filteredVideos = selectedGroup === 'All Lectures'
    ? videos
    : videos.filter(v => v.group === selectedGroup);

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        {user ? (
          <>
            <div className="user-greeting">
              <h1>Hello {user.first_name} {user.last_name}</h1>
              <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
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
              <button className="add-video-button" onClick={() => navigate('/add-video')}>
                Add Video
              </button>
              <div className="mode-selector">
                <button
                  className={`mode-button ${mode === 'pause' ? 'active' : ''}`}
                  onClick={() => setMode('pause')}
                >
                  Pause Mode
                </button>
                <button
                  className={`mode-button ${mode === 'question' ? 'active' : ''}`}
                  onClick={() => setMode('question')}
                >
                  Question Mode
                </button>
              </div>
            </div>
            
            {/* My Playlists Section */}
            <h2>My Playlists</h2>
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

            {/* Public Playlists Section */}
            <h2>Public Playlists</h2>
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

            {/* My Videos Section */}
            <h2>My Videos</h2>
            <div className="content-grid">
              {myGenericVideos.map(video => (
                <div className="video-card" key={video.video_id} onClick={() => setSelectedVideo(video)}>
                  <h4>{video.video_name}</h4>
                  <img src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`} alt={video.group} />
                  <div className="video-info">
                    <h5>Subject: {video.group}</h5>
                    <small>Length: {video.length}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* Other Videos Section */}
            <h2>Public Videos</h2>
            <div className="content-grid">
              {otherGenericVideos.map(video => (
                <div className="video-card" key={video.video_id} onClick={() => setSelectedVideo(video)}>
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
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setSelectedVideo(null)}>
              ← Back to Lectures
            </button>
            <VideoPlayer 
              mode={mode}
              lectureInfo={{
                videoId: selectedVideo.video_id,
                subject: selectedVideo.group
              }}
              userInfo={{ name: 'Test User', profile: 'default' }}
            />
          </>
        )}
      </div>
      <EyeDebugger enabled={eyeDebuggerOn} />
    </div>
  );
}

export default Dashboard;
