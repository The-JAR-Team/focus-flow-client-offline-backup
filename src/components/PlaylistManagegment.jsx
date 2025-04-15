import Navbar from './Navbar';

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function PlaylistManagegment() {
  const { playlistId } = useParams();

  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);

  useEffect(() => {
    // Get playlist data from localStorage (temporarily)
    const playlistData = JSON.parse(localStorage.getItem('selectedPlaylist'));
    setPlaylist(playlistData);
  }, []);

  if (!playlist) return <div>Loading...</div>;

  return (
    <div >   
        <div className="dashboard-container">
        <Navbar />
        </div>
        <div>   
        <p>playlist number:</p> {playlistId}
        <p>playlist name:</p> {playlist.playlist_name}
        </div>
    </div>
  );
}