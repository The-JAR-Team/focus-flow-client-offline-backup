import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/AddVideo.css';

const AddVideo = () => {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('URL submitted:', url);
    // Reset the URL field
    setUrl('');
  };

  return (
    <div className="dashboard-container">
      {/* Use the same Navbar so it stretches full width like your Dashboard */}
      <Navbar />

      {/* Centered content area, just like on your Dashboard */}
      <div className="dashboard-content">

      <h2>Add a New Video</h2>
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Lectures
        </button>

        

        <form onSubmit={handleSubmit} className="add-video-form">
          <label htmlFor="url" className="form-label">
            Video URL:
          </label>
          <input
            type="url"
            id="url"
            className="form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <input type ="text" id="subject" className="form-input" placeholder="Subject" required/>
          <button type="submit" className="submit-btn">
            Add Video
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddVideo;
