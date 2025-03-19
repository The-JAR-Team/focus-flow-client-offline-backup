import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Simulate logout
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
