import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/createPlaylist.css';
import { createPlaylist} from '../services/playlistService';
import { toast } from 'react-toastify';

export default function CreatePlaylist() {
  //TODO: add dispatch to update playlist list in redux store
  const navigate = useNavigate();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPermission, setNewPlaylistPermission] = useState('unlisted');

  const handleCreatePlaylist = async (e) => {
      e.preventDefault();
      const payload = {
          playlist_name: newPlaylistName,
          ...(newPlaylistPermission && { playlist_permission: newPlaylistPermission })
      };

      try {
          const res = await createPlaylist(payload);
          const newPlaylistData = res.newPlaylist || res; // handle different response formats
          // TODO: add to dispatch
          toast.success('Playlist created successfully!');
      } catch (error) {
          console.error(error);
          toast.error('Failed to create playlist. Please try again.');
      }
  };


  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="form-container">
        {/* Playlist creation sidebar */}
        <div className="form-card new-playlist-form">
          <h2 className="section-title">Create New Playlist</h2>
          <form onSubmit={handleCreatePlaylist} className="add-video-form">
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
          </form>
        </div>
      </div>
    </div>
  );
};