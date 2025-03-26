import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/AddVideo.css';
import { uploadVideo, createPlaylist, getPlaylists } from '../services/addVideo';
import axios from 'axios';

const AddVideo = () => {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [videoName, setVideoName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState('');
  const [uploadby, setUploadby] = useState('');
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPermission, setNewPlaylistPermission] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      video_id: videoId,
      video_name: videoName,
      subject,
      playlists: selectedPlaylists,
      description,
      length,
      uploadby
    };

    try {
      await uploadVideo(payload);
      // Clear fields after successful upload
      setVideoId('');
      setVideoName('');
      setSubject('');
      setDescription('');
      setLength('');
      setUploadby('');
      setSelectedPlaylists([]);
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
        <h2>Add a New Video</h2>
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Lectures
        </button>
        <form onSubmit={handleSubmit} className="add-video-form">
          <label htmlFor="videoId" className="form-label">Video ID:</label>
          <input
            type="text"
            id="videoId"
            className="form-input"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="OJu7kIFXzxg"
            required
          />
          <label htmlFor="videoName" className="form-label">Video Name:</label>
          <input
            type="text"
            id="videoName"
            className="form-input"
            value={videoName}
            onChange={(e) => setVideoName(e.target.value)}
            placeholder="Statistics"
            required
          />
          <label htmlFor="subject" className="form-label">Subject:</label>
          <input 
            type="text" 
            id="subject" 
            className="form-input" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Statistics" 
            required
          />
          <label htmlFor="description" className="form-label">Description:</label>
          <textarea
            id="description"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Some description..."
            required
          />
          <label htmlFor="length" className="form-label">Length:</label>
          <input
            type="text"
            id="length"
            className="form-input"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="03:12:34"
            required
          />
          <label htmlFor="uploadby" className="form-label">Upload By:</label>
          <input
            type="text"
            id="uploadby"
            className="form-input"
            value={uploadby}
            onChange={(e) => setUploadby(e.target.value)}
            placeholder="Prof. Jane AI"
            required
          />
          <label htmlFor="playlists" className="form-label">Select Playlists:</label>
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
          <button type="submit" className="submit-btn">Add Video</button>
        </form>
        <div className="new-playlist-form">
          <h3>Create New Playlist</h3>
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
  );
};

export default AddVideo;
