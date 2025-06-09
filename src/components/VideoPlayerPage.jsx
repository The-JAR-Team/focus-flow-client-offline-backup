import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import VideoPlayer from './VideoPlayer';
import Navbar from './Navbar';
import '../styles/VideoPlayerPage.css';

function VideoPlayerPage() {
  const { playlistId, videoId } = useParams();
  const navigate = useNavigate();
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get the mode from localStorage (or default to 'pause')
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'questions');
  
  // Get current playlist information from Redux store
  const { playlist } = useSelector(state => state.playlist);

  useEffect(() => {
    // If we have the playlist in redux already
    if (playlist && playlist.playlist_id === parseInt(playlistId, 10)) {
      const video = playlist.playlist_items.find(
        item => item.external_id === videoId
      );
      
      if (video) {
        setVideoInfo({
          videoId: video.external_id,
          subject: video.subject,
          videoDuration: video.length,
        });
        setLoading(false);
        return;
      }
    }
    
    // If we don't have the video info, redirect to the playlist page
    // The user can select the video properly from there
    navigate(`/playlist/${playlistId}`);
  }, [playlistId, videoId, playlist, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading video...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(`/playlist/${playlistId}`)}>
          Back to Playlist
        </button>
      </div>
    );
  }
  return (
    <div className="video-player-page">
      <div style={{ padding: '20px' }}>
        <Navbar />
      </div>
      <div className="video-player-content">
        <button className="back-button" onClick={() => navigate(`/playlist/${playlistId}`)}>
          ← Back to Playlist
        </button>
        
        {videoInfo && (
          <VideoPlayer 
            mode={mode}
            lectureInfo={videoInfo}
            userInfo={{ name: 'Test User', profile: 'default' }}
          />
        )}
      </div>
    </div>
  );
}

export default VideoPlayerPage;
