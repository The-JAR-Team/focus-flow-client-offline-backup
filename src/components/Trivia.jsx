import React, { useState, useEffect } from 'react';
import { fetchVideoMetadata } from '../services/videos';
import '../styles/Trivia.css';
import QuizMode from './QuizMode';
import Navbar from './Navbar';  // Add this import
import { useNavigate } from 'react-router-dom';

function Trivia() {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadVideos = async () => {
      const response = await fetchVideoMetadata();
      // Extract unique videos from playlists
      const uniqueVideos = new Map();
      response.playlists.forEach(playlist => {
        playlist.playlist_items.forEach(video => {
          if (!uniqueVideos.has(video.video_id)) {
            uniqueVideos.set(video.video_id, video);
          }
        });
      });
      
      const videosArray = Array.from(uniqueVideos.values());
      // Store videos in localStorage for TriviaVideoPage to use
      localStorage.setItem('triviaVideos', JSON.stringify(videosArray));
      setVideos(videosArray);
      setFilteredVideos(videosArray);
      
      // Extract unique subjects
      const uniqueSubjects = [...new Set(videosArray.map(video => video.subject))];
      setSubjects(uniqueSubjects);
    };

    loadVideos();
  }, []);

  useEffect(() => {
    let filtered = [...videos];

    if (searchTerm) {
      filtered = filtered.filter(video => 
        video.video_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterSubject !== 'all') {
      filtered = filtered.filter(video => video.subject === filterSubject);
    }

    if (filterOwner !== 'all') {
      filtered = filtered.filter(video => 
        filterOwner === 'me' 
          ? video.upload_by === 'YOUR_USERNAME' // Replace with actual user check
          : video.upload_by !== 'YOUR_USERNAME'
      );
    }

    setFilteredVideos(filtered);
  }, [searchTerm, filterOwner, filterSubject, videos]);

  const handleVideoSelect = (video) => {
    // Store the selected video in localStorage before navigating
    const storedVideos = JSON.parse(localStorage.getItem('triviaVideos') || '[]');
    if (!storedVideos.some(v => v.video_id === video.video_id)) {
      storedVideos.push(video);
      localStorage.setItem('triviaVideos', JSON.stringify(storedVideos));
    }
    navigate(`/trivia/${video.video_id}`);
  };

  if (selectedVideo) {
    return <QuizMode video={selectedVideo} onBack={() => setSelectedVideo(null)} />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <Navbar />
      <div className="trivia-container">
        
        <div className="filters">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select 
            value={filterOwner} 
            onChange={(e) => setFilterOwner(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Videos</option>
            <option value="me">My Videos</option>
            <option value="others">Other's Videos</option>
          </select>

          <select 
            value={filterSubject} 
            onChange={(e) => setFilterSubject(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <div className="videos-grid">
          {filteredVideos.map(video => (
            <div 
              key={video.video_id} 
              className="video-card"
              onClick={() => handleVideoSelect(video)}
            >
              <img 
                src={`https://img.youtube.com/vi/${video.external_id}/hqdefault.jpg`} 
                alt={video.video_name} 
              />
              <div className="video-info">
                <h3>{video.video_name}</h3>
                <p>Subject: {video.subject}</p>
                <p>By: {video.upload_by}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Trivia;
