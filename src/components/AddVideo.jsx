import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import Navbar from './Navbar';
import '../styles/AddVideo.css';
import { uploadVideo, createPlaylist, getPlaylists, extractVideoId } from '../services/addVideo';

const AddVideo = () => {
  const [videoId, setVideoId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [uploadby, setUploadby] = useState('');
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPermission, setNewPlaylistPermission] = useState('unlisted');
  const [duration, setDuration] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [extractedId, setExtractedId] = useState('');
  
  // New states for loading and status message
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // "success" or "error"

  // New states for playlist status message
  const [playlistStatusMessage, setPlaylistStatusMessage] = useState('');
  const [playlistStatusType, setPlaylistStatusType] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch existing playlists using getPlaylists service
    getPlaylists()
      .then(response => {
        if (response.status === "success") {
          setAllPlaylists(response.playlists);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleVideoInput = (e) => {
    const input = e.target.value;
    setVideoId(input);
    const extracted = extractVideoId(input);
    setExtractedId(extracted);
  };

  const handleReady = (event) => {
    // Get video duration
    console.log(event)
    const durationInSeconds = event.target.getDuration();
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    setDuration(formattedDuration);

    // Get video data
    const videoData = event.target.getVideoData();
    setVideoTitle(videoData.title);
    
    // Get channel title (uploader)
    setUploadby(videoData.author);
    console.log(videoData)

    // Get video description
    const player = event.target;
    player.getIframe().contentWindow.postMessage(JSON.stringify({
      'event': 'command',
      'func': 'getVideoData',
      'args': []
    }), '*');

    // Add event listener to receive description
    const handleMessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.info && data.info.description) {
          setDescription(data.info.description);
          window.removeEventListener('message', handleMessage);
        }
      } catch (error) {
        // Ignore parsing errors from other messages
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('');
    const payload = {
      video_id: extractVideoId(videoId),  // Ensure only the video id is sent
      video_name: videoTitle,
      subject: subject,
      playlists: selectedPlaylists.length > 0 ? selectedPlaylists : ['generic'], // Fallback to generic if none selected
      description: description,
      length: duration,
      uploadby: uploadby
    };

    try {
      await uploadVideo(payload);
      // Clear fields after successful upload
      setVideoId('');
      setExtractedId('');
      setVideoTitle('');
      setSubject('');
      setDescription('');
      setUploadby('');
      setSelectedPlaylists([]);
      setDuration('');
      toast.success('Video added successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    const payload = {
      playlist_name: newPlaylistName,
      ...(newPlaylistPermission && { playlist_permission: newPlaylistPermission })
    };

    try {
      const res = await createPlaylist(payload);
      const newPlaylistData = res.newPlaylist || res; // handle different response formats
      // Ensure newPlaylist has both playlist_id and playlist_name properties,
      // forcing playlist_name to use newPlaylistData.playlist_name || newPlaylistData.name || newPlaylistName
      const newPlaylist = {
        ...newPlaylistData,
        playlist_id: newPlaylistData.playlist_id || newPlaylistData.id || newPlaylistData.playlist_name || newPlaylistName,
        playlist_name: newPlaylistData.playlist_name || newPlaylistData.name || newPlaylistName
      };
      // Refresh playlists list
      setAllPlaylists(prev => [...prev, newPlaylist]);
      setNewPlaylistName('');
      setNewPlaylistPermission('');
      // Set success message for playlist creation
      setPlaylistStatusMessage('Playlist created successfully!');
      setPlaylistStatusType('success');
      setTimeout(() => {
        setPlaylistStatusMessage('');
        setPlaylistStatusType('');
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePlaylistSelect = (e) => {
    const playlistName = e.target.value;
    if (e.target.checked) {
      setSelectedPlaylists(prev => [...prev, playlistName]);
    } else {
      setSelectedPlaylists(prev => prev.filter(name => name !== playlistName));
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Lectures
        </button>
        
        <div className="form-container">
          {/* Main video form */}
          <div className="form-card">
            <h2 className="section-title">Add a New Video</h2>
            <form onSubmit={handleSubmit} className="add-video-form">
              <label htmlFor="videoId" className="form-label">Video ID</label>
              <input
                type="text"
                id="videoId"
                className="form-input"
                value={videoId}
                onChange={handleVideoInput}
                placeholder="Enter YouTube video ID or URL"
                required
              />
              
              {videoId && (
                <div className="extracted-id">
                  {extractedId ? (
                    <span className="valid-id">Valid Video ID: {extractedId}</span>
                  ) : (
                    <span className="invalid-id">Invalid YouTube video ID/URL</span>
                  )}
                </div>
              )}

              {extractedId && (
                <div className="video-preview">
                  <YouTube 
                    videoId={extractedId} 
                    opts={{
                      width: '100%',
                      height: '400',
                      playerVars: {
                        controls: 1,
                      },
                    }}
                    onReady={handleReady}
                  />
                  {duration && (
                    <div>
                      <div className="video-duration">Duration: {duration}</div>
                      <div className="video-title">Title: {videoTitle}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-grid">
                <div>
                  <label htmlFor="subject" className="form-label">Subject</label>
                  <input 
                    type="text" 
                    id="subject" 
                    className="form-input" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Mathematics" 
                    required
                  />
                </div>

                <div>
                  <label htmlFor="uploadby" className="form-label">Upload-by</label>
                  <input
                    type="text"
                    id="uploadby"
                    className="form-input"
                    value={uploadby}
                    onChange={(e) => setUploadby(e.target.value)}
                    placeholder="e.g., Prof. Smith"
                    required
                  />
                </div>
              </div>

              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description..."
                rows="4"
                required
              />

              <label htmlFor="playlists" className="form-label">Add to Playlists</label>
              <div className="playlist-checkbox-container">
                {allPlaylists
                  .filter(playlist => playlist.playlist_name.toLowerCase() !== 'generic')
                  .map((playlist) => (
                    <label key={playlist.playlist_id} className="playlist-checkbox-label">
                      <input
                        type="checkbox"
                        value={playlist.playlist_name}
                        checked={selectedPlaylists.includes(playlist.playlist_name)}
                        onChange={handlePlaylistSelect}
                        className="playlist-checkbox"
                      />
                      {playlist.playlist_name}
                    </label>
                  ))
                }
              </div>

              <button type="submit" className="submit-btn">
                {loading ? 'Uploading...' : 'Add Video'}
              </button>
              { (loading || statusMessage) && (
                <div className={`status-indicator ${statusType}`}>
                  {loading ? <span>Loading...</span> : <span>{statusMessage}</span>}
                </div>
              )}
            </form>
          </div>

          {/* Playlist creation sidebar */}
          <div className="form-card">
            <h3 className="section-title">Create New Playlist</h3>
            <form onSubmit={handleCreatePlaylist}>
              <label htmlFor="newPlaylistName" className="form-label">Playlist Name:</label>
              <input
                type="text"
                id="newPlaylistName"
                className="form-input"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Favorite Songs"
                required
              />
              <div className="permission-toggle-container">
                <button
                  type="button"
                  className={`permission-toggle ${newPlaylistPermission === 'public' ? 'active' : ''}`}
                  onClick={() => setNewPlaylistPermission(prev => prev === 'public' ? 'unlisted' : 'public')}
                >
                  {newPlaylistPermission === 'public' ? 'Public' : 'Unlisted'}
                </button>
                <p className="permission-description">
                  {newPlaylistPermission === 'public' 
                    ? '👥 Everyone can see this playlist' 
                    : '🔒 Only people with the link can see this playlist'}
                </p>
              </div>
              <button type="submit" className="submit-btn">Create Playlist</button>
              {playlistStatusMessage && (
                <div className={`status-indicator ${playlistStatusType}`}>
                  {playlistStatusMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddVideo;
