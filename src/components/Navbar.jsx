import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Navbar.css';
import { logoutUser } from '../services/api';
import { useDispatch } from 'react-redux';
import { clearUserData } from '../redux/userSlice';
import { clearPlaylist } from '../redux/playlistSlice';
import { persistor } from '../redux/store';

function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Clear data from Redux store
      dispatch(clearUserData());
      dispatch(clearPlaylist());
      // Clear localStorage
      await persistor.purge();

    } catch (err) {
      console.error('Logout failed:', err);
    }
    navigate('/');

  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/dashboard" className="navbar-brand">Focus Flow</Link>
        <button className="nav-button" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button className="nav-button" onClick={() => navigate('/add-video')}>Add Video</button>
        <button className="nav-button" onClick={() => navigate('/create-playlist')}>Create Playlist</button>
        <button className="nav-button" onClick={() => navigate('/trivia')}>Trivia</button>
      </div>
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </nav>
  );
}

export default Navbar;
