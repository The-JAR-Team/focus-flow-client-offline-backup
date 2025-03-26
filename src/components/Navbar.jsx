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
      <h1>Focus Flow</h1>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
}

export default Navbar;
