import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';

function PlaylistView() {
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const [selectedVideo, setSelectedVideo] = React.useState(null);
  const [playlist, setPlaylist] = React.useState(null);
  const [mode, setMode] = React.useState(() => {
    // Get mode from localStorage or default to 'pause'
    return localStorage.getItem('selectedMode') || 'pause';
  });

  React.useEffect(() => {
    // Get playlist data from localStorage (temporarily)
    const playlistData = JSON.parse(localStorage.getItem('selectedPlaylist'));
    setPlaylist(playlistData);
  }, [playlistId]);

  // Update mode in localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('selectedMode', mode);
  }, [mode]);

  if (!playlist) return <div>Loading...</div>;

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        
        <h2>{playlist.playlist_name}</h2>
        <div className="playlist-header">
          <p>Owner: {playlist.playlist_owner_name}</p>
          <p>Permission: {playlist.playlist_permission}</p>
        </div>

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

        {!selectedVideo ? (
          <div className="content-grid">
            {playlist.playlist_items.map(video => (
              <div 
                className="video-card" 
                key={video.video_id || video.external_id}
                onClick={() => setSelectedVideo(video)}
              >
                <h4>{video.video_name}</h4>
                <img 
                  src={`https://img.youtube.com/vi/${video.external_id}/hqdefault.jpg`} 
                  alt={video.subject}
                />
                <div className="video-info">
                  <h5>Subject: {video.subject}</h5>
                  <small>Length: {video.length}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <button className="back-button" onClick={() => setSelectedVideo(null)}>
              ← Back to Playlist
            </button>
            <VideoPlayer 
              mode={mode}
              lectureInfo={{
                videoId: selectedVideo.external_id,
                subject: selectedVideo.subject
              }}
              userInfo={{ name: 'Test User', profile: 'default' }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default PlaylistView;
