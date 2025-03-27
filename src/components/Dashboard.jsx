import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import EyeDebugger from './EyeDebugger';
import '../styles/Dashboard.css';
import { fetchVideoMetadata } from '../services/videos';
import { fetchUserInfo, logoutUser } from '../services/api';

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
    const initializeDashboard = async () => {
      try {
        const userData = await fetchUserInfo();
        setUser(userData);
        
        const data = await fetchVideoMetadata();
        if (data && data.playlists) {
          const genericPlaylist = data.playlists.find(p => p.playlist_name === 'generic');
          const otherPlaylists = data.playlists.filter(p => p.playlist_name !== 'generic');
          
          // Process generic playlist videos
          if (genericPlaylist && genericPlaylist.playlist_items) {
            const allVideos = genericPlaylist.playlist_items.map(item => ({
              ...item,
              video_id: item.external_id,
              group: item.subject,
              uploadby: item.upload_by
            }));
            
            // Use playlist_owner_id instead of uploadby
            console.log(userData)
            setMyGenericVideos(allVideos.filter(v => v.playlist_owner_id === userData.user_id));
            setOtherGenericVideos(allVideos.filter(v => v.playlist_owner_id !== userData.user_id));
          }
          
          // Process playlists using playlist_owner_id
          setMyPlaylists(otherPlaylists.filter(p => p.playlist_owner_id === userData.user_id));
          setOtherPlaylists(otherPlaylists.filter(p => p.playlist_owner_id !== userData.user_id));
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setError('Failed to load content');
      }
    };

    initializeDashboard();
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
            </div>
            
            {/* My Playlists Section */}
            <h2>My Playlists</h2>
            <div className="content-grid">
              {myPlaylists.map(playlist => (
                <div className="playlist-card" key={playlist.playlist_id}>
                  <h4>{playlist.playlist_name}</h4>
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
                <div className="playlist-card" key={playlist.playlist_id}>
                  <h4>{playlist.playlist_name}</h4>
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
