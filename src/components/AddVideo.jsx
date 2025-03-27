import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import Navbar from './Navbar';
import '../styles/AddVideo.css';
import { uploadVideo, createPlaylist, getPlaylists } from '../services/addVideo';

const AddVideo = () => {
  const [videoId, setVideoId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [uploadby, setUploadby] = useState('');
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPermission, setNewPlaylistPermission] = useState('');
  const [duration, setDuration] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

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

  const handleReady = (event) => {
    const durationInSeconds = event.target.getDuration();
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    setDuration(formattedDuration);
    // Get video title and set it as initial description
    const title = event.target.getVideoData().title;
    setVideoTitle(title);
    
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      video_id: videoId,
      video_name: videoTitle,
      subject : subject,
      playlists: selectedPlaylists,
      description: description,
      length: duration,
      uploadby : uploadby
    };

    try {
      await uploadVideo(payload);
      // Clear fields after successful upload
      setVideoId('');
      setVideoTitle('');
      setSubject('');
      setDescription('');
      setUploadby('');
      setSelectedPlaylists([]);
      setDuration('');
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
    }
  };

  const handlePlaylistSelect = (e) => {
    const options = e.target.options;
    const selected = [];
    for(let i=0; i<options.length; i++){
      if(options[i].selected){
        selected.push(options[i].value);
      }
    }
    setSelectedPlaylists(selected);
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
          <div className="video-card">
            <h2 className="section-title">Add a New Video</h2>
            <form onSubmit={handleSubmit} className="add-video-form">
              <label htmlFor="videoId" className="form-label">Video ID</label>
              <input
                type="text"
                id="videoId"
                className="form-input"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="Enter YouTube video ID (e.g., dQw4w9WgXcQ)"
                required
              />
              
              {/^[a-zA-Z0-9_-]{11}$/.test(videoId) && (
                <div className="video-preview">
                  <YouTube 
                    videoId={videoId} 
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
              <select
                id="playlists"
                className="playlist-select"
                multiple
                value={selectedPlaylists}
                onChange={handlePlaylistSelect}
              >
                {allPlaylists.map((playlist) => (
                  <option key={playlist.playlist_id} value={playlist.playlist_id}>
                    {playlist.playlist_name}
                  </option>
                ))}
              </select>

              <button type="submit" className="submit-btn">
                Add Video
              </button>
            </form>
          </div>

          {/* Playlist creation sidebar */}
          <div className="video-card new-playlist-card">
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
              <label htmlFor="newPlaylistPermission" className="form-label">Playlist Permission (optional):</label>
              <input
                type="text"
                id="newPlaylistPermission"
                className="form-input"
                value={newPlaylistPermission}
                onChange={(e) => setNewPlaylistPermission(e.target.value)}
                placeholder="unlisted"
              />
              <button type="submit" className="submit-btn">Create Playlist</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddVideo;
