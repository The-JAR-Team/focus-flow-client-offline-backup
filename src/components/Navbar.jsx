import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Navbar.css';
import { logoutUser } from '../services/api';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      navigate('/'); // redirect to base page
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
        <button className="nav-button" onClick={() => navigate('/trivia')}>Trivia</button>
      </div>
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </nav>
  );
}

export default Navbar;
