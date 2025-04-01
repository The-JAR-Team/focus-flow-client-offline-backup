import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import { getSubscriberCount } from '../services/subscriptionService';
import SubscribeModal from './SubscribeModal';
import UnsubscribeModal from './UnsubscribeModal'; // added import

const BASE_URL = 'https://focus-flow-236589840712.me-west1.run.app';

function PlaylistView() {
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const [selectedVideo, setSelectedVideo] = React.useState(null);
  const [playlist, setPlaylist] = React.useState(null);
  const [mode, setMode] = React.useState(() => localStorage.getItem('mode') || 'pause');
  const [subscriberCount, setSubscriberCount] = React.useState(null); // null indicates not fetched or not authorized
  const [showSubscribeModal, setShowSubscribeModal] = React.useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = React.useState(false); // added state

  React.useEffect(() => {
    // Get playlist data from localStorage (temporarily)
    const playlistData = JSON.parse(localStorage.getItem('selectedPlaylist'));
    setPlaylist(playlistData);
  }, [playlistId]);

  React.useEffect(() => {
    // Write mode to localStorage under key 'mode'
    localStorage.setItem('mode', mode);
  }, [mode]);

  // Fetch subscriber count; if fails, do not show subscriber section
  React.useEffect(() => {
    if (playlist && playlist.playlist_id) {
      getSubscriberCount(playlist.playlist_id)
        .then(count => setSubscriberCount(count))
        .catch(error => {
          console.error(error);
          console.log('Not authorized to view subscrwe got the errrrrrrrrrrrrrrrrrrrrrunt');
          setSubscriberCount(null);
        });
    }
  }, [playlist]);

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
          {subscriberCount !== null && (
            <>
              <p>Subscribers: {subscriberCount}</p>
              <button className="subscribe-button" onClick={() => setShowSubscribeModal(true)}>
                Add Subscriber
              </button>
              |
              <button className="unsubscribe-button" onClick={() => setShowUnsubscribeModal(true)}>
                Remove Subscription
              </button>
            </>
          )}
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
        {showSubscribeModal && (
          <SubscribeModal 
            playlistId={playlist.playlist_id}
            onClose={() => setShowSubscribeModal(false)}
            onSubscribed={() => {
              // Refresh subscriber count if authorized
              getSubscriberCount(playlist.playlist_id)
                .then(count => setSubscriberCount(count))
                .catch(err => setSubscriberCount(null));
            }}
          />
        )}
        {showUnsubscribeModal && ( // added unsubscribe modal block
          <UnsubscribeModal 
            playlistId={playlist.playlist_id}
            onClose={() => setShowUnsubscribeModal(false)}
            onUnsubscribed={() => {
              getSubscriberCount(playlist.playlist_id)
                .then(count => setSubscriberCount(count))
                .catch(err => setSubscriberCount(null));
            }}
          />
        )}
      </div>
    </div>
  );
}

export default PlaylistView;
