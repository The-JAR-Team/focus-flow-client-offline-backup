import React, { useState, useEffect } from 'react';
import { fetchVideoMetadata } from '../services/videos';
import '../styles/Trivia.css';
import QuizMode from './QuizMode';
import Navbar from './Navbar';  // Add this import
import { useNavigate } from 'react-router-dom';
import { fetchUserInfo } from '../services/api';
import { getVideoOwnership } from '../utils/videoUtils';
import Spinner from './Spinner';

function Trivia() {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoOwnership, setVideoOwnership] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load both video metadata and user info in parallel
        const [videoResponse, userInfoResponse] = await Promise.all([
          fetchVideoMetadata(),
          fetchUserInfo()
        ]);

        // Handle video data
        const ownership = getVideoOwnership(videoResponse);
        setVideoOwnership(ownership);
        
        const videosArray = [...ownership.ownedVideos, ...ownership.otherVideos];
        localStorage.setItem('triviaVideos', JSON.stringify(videosArray));
        setVideos(videosArray);
        
        // Extract and set subjects
        const uniqueSubjects = [...new Set(videosArray.map(video => video.subject))];
        setSubjects(uniqueSubjects);

        // Handle user info
        console.log('User info loaded:', userInfoResponse);
        setUserInfo(userInfoResponse);

        // Set initial filtered videos after both data are loaded
        const initialFiltered = videosArray.filter(video => {
          console.log("video?.upload_by == fullName", video?.upload_by);

          if (filterOwner === 'all') return true;
          const fullName = `${userInfoResponse['first name']} ${userInfoResponse['last name']}`;
          return filterOwner === 'me' 
            ? video?.upload_by === fullName
            : video?.upload_by !== fullName;
        });
        setFilteredVideos(initialFiltered);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array as this should only run once

  // Modify the filter effect to only run when we have both videos and user info
  useEffect(() => {
    if (!videos.length || !videoOwnership) return; // Don't run if we don't have both

    let filtered = [...videos];

    if (searchTerm) {
      filtered = filtered.filter(video => 
        video?.video_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        video?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video?.upload_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterSubject !== 'all') {
      filtered = filtered.filter(video => video?.subject === filterSubject);
    }

    if (filterOwner !== 'all') {
      filtered = filtered.filter(video => {
        const isOwned = videoOwnership.isOwnedVideo(video.external_id);
        return filterOwner === 'me' ? isOwned : !isOwned;
      });
    }

    setFilteredVideos(filtered);
  }, [searchTerm, filterOwner, filterSubject, videos, videoOwnership]);

  const handleVideoSelect = (video) => {
    // Store the selected video in localStorage before navigating
    const storedVideos = JSON.parse(localStorage.getItem('triviaVideos') || '[]');
    if (!storedVideos.some(v => v.video_id === video.video_id)) {
      storedVideos.push(video);
      localStorage.setItem('triviaVideos', JSON.stringify(storedVideos));
    }
    navigate(`/trivia/${video.video_id}`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="trivia-container">
          <div className="loading-container">
            <Spinner size="large" message="Loading videos and questions..." />
          </div>
        </div>
      </div>
    );
  }

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
              key={video?.video_id || Math.random()} 
              className="video-card"
              onClick={() => handleVideoSelect(video)}
            >
              <img 
                src={video?.external_id ? `https://img.youtube.com/vi/${video.external_id}/hqdefault.jpg` : ''} 
                alt={video?.video_name || 'Untitled'} 
              />
              <div className="video-info">
                <h3>{video?.video_name || 'Untitled'}</h3>
                <p>Subject: {video?.subject || 'Unknown'}</p>
                <p>By: {video?.upload_by || 'Unknown'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Trivia;
