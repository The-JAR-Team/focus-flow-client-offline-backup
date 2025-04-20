import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import { getSubscriberCount } from '../services/subscriptionService';
import SubscribeModal from './SubscribeModal';
import UnsubscribeModal from './UnsubscribeModal'; // added import
import { removeVideoFromPlaylist, getPlaylistById, updatePlaylist } from '../services/playlistService';
import { removeVideo, updatePlaylistData } from '../redux/dashboardSlice';
import { useDispatch } from 'react-redux';
import { setSelectedPlaylist, clearPlaylist, removeVideoFromSelectedPlaylist } from '../redux/playlistSlice';
import { toast } from 'react-toastify';

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
          console.log('playlist is empty');
          navigate('/dashboard'); // Redirect to dashboard if no videos left
          dispatch(clearPlaylist());
        }
        else {
          dispatch(removeVideoFromSelectedPlaylist(video.playlist_item_id));
          console.log('playlist updated', playlist);
        }
        toast.success('Video removed successfully!');
      } catch (error) {
        console.error('Failed to remove video:', error);
        toast.error(`Failed to remove video. ${error}.`); 
      }
    }
  };

  const savePlaylistChanges = async () => {
    try {
      await updatePlaylist(playlist.playlist_id, {
        playlist_name: editedName,
        playlist_permission: editedPermission
      });

      // Update local state
      const updatedPlaylist = await getPlaylistById(playlist.playlist_id);
      dispatch(setSelectedPlaylist(updatedPlaylist));

      // Exit edit mode
      setIsEditingName(false);
      setIsEditingPermission(false);

      toast.success('Playlist updated successfully!');
    } catch (error) {
      toast.error(`Failed to update playlist. ${error.response.data.reason}`);
      console.error(error.response.data.reason);
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
            <>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
              />
              <button onClick={savePlaylistChanges}>Save</button>
              <button onClick={() => setIsEditingName(false)}>Cancel</button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

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
          {isOwner && (
            <>
              <button className="edit-button" onClick={() =>{
                navigate('/edit-playlist/' + playlist.playlist_id);
              }}>
                Edit Playlist
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
