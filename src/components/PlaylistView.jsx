import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import { getSubscriberCount } from '../services/subscriptionService';
import SubscribeModal from './SubscribeModal';
import UnsubscribeModal from './UnsubscribeModal'; // added import
import { removeVideoFromPlaylist, updatePlaylistName, updatePlaylistPermission } from '../services/playlistService';
import { removeVideo, updatePlaylistData } from '../redux/dashboardSlice';
import { useDispatch } from 'react-redux';
import { setSelectedPlaylist, clearPlaylist, removeVideoFromSelectedPlaylist, editSelectedPlaylistName, editSelectedPlaylistPermission } from '../redux/playlistSlice';
import { toast } from 'react-toastify';
import '../styles/PlaylistView.css';

function PlaylistView() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { playlistId } = useParams();
  const [selectedVideo, setSelectedVideo] = React.useState(null);
  const [mode, setMode] = React.useState(() => localStorage.getItem('mode') || 'pause');
  const [subscriberCount, setSubscriberCount] = React.useState(null); // null indicates not fetched or not authorized
  const [showSubscribeModal, setShowSubscribeModal] = React.useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = React.useState(false); // added state
  
  const { currentUser } = useSelector((state) => state.user);
  const { playlist } = useSelector(state => state.playlist);
  const isOwner = playlist?.playlist_owner_id === currentUser?.user_id;
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [isEditingPermission, setIsEditingPermission] = React.useState(false);
  const [editedName, setEditedName] = React.useState(playlist.playlist_name);
  const [editedPermission, setEditedPermission] = React.useState(playlist.playlist_permission);

  const { myPlaylists } = useSelector((state) => state.dashboard);

  React.useEffect(() => {
    // Write mode to localStorage under key 'mode'
    localStorage.setItem('mode', mode);
  }, [mode]);

  React.useEffect(() => {
    if (playlist) {
      setSelectedPlaylist(playlist);
    }
  }, [playlist]);

  if (!playlist) return <div>Loading...</div>;

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
  }, [playlist?.playlist_id]); // fetch only if we didn't delete all videos from playlist

  // delete video from My Playlist (owner's) 
  const handleDeleteVideo = async (video) => {
    if (window.confirm(`Are you sure you want to remove "${video.video_name}" from this playlist?`)) {
      try {
        await removeVideoFromPlaylist(video);
        dispatch(removeVideo({
          playlist_name: playlist.playlist_name,
          playlist_item_id: video.playlist_item_id
        }));

        if (playlist.playlist_items.length === 1) {
          navigate('/dashboard'); // Redirect to dashboard if no videos left
          dispatch(clearPlaylist());
        }
        else {
          dispatch(removeVideoFromSelectedPlaylist({ playlist_item_id: video.playlist_item_id }));
        }
        toast.success('Video removed successfully!');
      } catch (error) {
        console.error('Failed to remove video:', error);
        toast.error(`Failed to remove video. ${error}.`); 
      }
    }
  };

  const savePlaylistName = async () => {
    try {
      await updatePlaylistName(playlist.playlist_name, editedName);

      dispatch(editSelectedPlaylistName(editedName));

      dispatch(updatePlaylistData({
        playlist_name: playlist.playlist_name,
        name: editedName, 
        permission: null
      }));

      // Exit edit mode
      setIsEditingName(false);

      toast.success('Playlist updated successfully!');
    } catch (error) {
      const errorMessage = error.message;
      toast.error(errorMessage);
      console.error(errorMessage);
    }
  };

  const savePlaylistPermission = async () => {
    try {
      await updatePlaylistPermission(playlist.playlist_id, editedPermission);

      dispatch(editSelectedPlaylistPermission(editedPermission));

      dispatch(updatePlaylistData({
        playlist_name: playlist.playlist_name,
        name: null,
        permission: editedPermission
      }));

      // Exit edit mode
      setIsEditingPermission(false);

      toast.success('Playlist permission updated successfully!');
    } catch (error) {
      const errorMessage = error.message;
      toast.error(errorMessage);
      console.error(errorMessage);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        
        {/* Playlist name with inline editing */}
        <div className="playlist-title-container">
          {isEditingName ? (
            <div className="inline-edit-form">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                className="playlist-name-input"
                maxLength={50}
              />
              <div className="edit-actions">
                <button 
                  onClick={savePlaylistName}
                  disabled={!editedName.trim() || editedName === playlist.playlist_name}
                  className="save-btn"
                >
                  Save
                </button>
                <button 
                  onClick={() => {
                    setEditedName(playlist.playlist_name); // Reset to original
                    setIsEditingName(false);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="playlist-title-display">
              <h2>{playlist.playlist_name}</h2>
              {isOwner && (
                <button
                  className="edit-icon"
                  onClick={() => setIsEditingName(true)}
                  title="Edit playlist name"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>

        <div className="playlist-header">
          <div className="permission-container"> 
            {isEditingPermission?(
              <div className="permission-toggles-container"> 
                <div className="permission-toggles-group">
                  <button
                    className={`permission-toggles ${editedPermission === 'unlisted' ? 'active' : ''}`}
                    onClick={() => setEditedPermission('unlisted')}
                  >
                    <span className="permission-icon">🔗</span>
                    <span>Unlisted</span>
                  </button>

                  <button
                    className={`permission-toggles ${editedPermission === 'public' ? 'active' : ''}`}
                    onClick={() => setEditedPermission('public')}
                  >
                    <span className="permission-icon">👥</span>
                    <span>Public</span>
                  </button>

                  <button
                    className={`permission-toggles ${editedPermission === 'private' ? 'active' : ''}`}
                    onClick={() => setEditedPermission('private')}
                  >
                    <span className="permission-icon">🔒</span>
                    <span>Private</span>
                  </button>
                </div>
                <div className="permission-edit-actions">
                  <button
                    onClick={savePlaylistPermission}
                    disabled={editedPermission === playlist.playlist_permission}
                    className="save-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditedPermission(playlist.playlist_permission);
                      setIsEditingPermission(false);
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ):(
                <div className="inline-edit-form"> 
                <p>Permission: {playlist.playlist_permission}</p>
                {isOwner && (
                  <button
                    className="edit-icon"
                    onClick={() => setIsEditingPermission(true)}
                    title="Edit playlist permission"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>

          <p>Owner: {playlist.playlist_owner_name}</p>
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
          <div className="content-grid-playlist">
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
                {/* Delete button for playlist owner */}
                {isOwner && (
                  <div className="video-delete-button" onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the video
                      handleDeleteVideo(video);
                    }}
                  >
                    🗑️
                  </div>
                )}
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
                subject: selectedVideo.subject,
                videoDuration: selectedVideo.length,
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
