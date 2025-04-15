import Navbar from './Navbar';
import { useSelector } from 'react-redux';

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function EditPlaylist() {
  const { playlistId } = useParams();

  const navigate = useNavigate();
  const { playlist } = useSelector(state => state.playlist);


  return (
    <div >   
        <div className="dashboard-container">
          <Navbar />
        </div>
        <div>  
        <button className="back-button" onClick={() => navigate(`/playlist/${playlist.playlist_id}`)}>
          ← Back to Playlist
        </button> 
          <p>playlist number:</p> {playlistId}
          <p>playlist name:</p> {playlist.playlist_name}
        </div>
    </div>
  );
}