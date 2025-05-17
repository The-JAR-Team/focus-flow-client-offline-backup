import React, { useState, useEffect, useRef } from 'react';
import '../styles/Trivia.css';
import QuizMode from './QuizMode';
import Navbar from './Navbar';  // Add this import
import { useNavigate } from 'react-router-dom';
import { fetchUserInfo } from '../services/api';
import { getVideoOwnership } from '../utils/videoUtils';
import { fetchTriviaData, filterVideos, extractPlaylists } from '../services/triviaService';
import Spinner from './Spinner';

function Trivia() {  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState(() => {
    // Load saved owner filter from localStorage, default to 'all'
    return localStorage.getItem('triviaFilterOwner') || 'all';
  });
  const [filterSubject, setFilterSubject] = useState(() => {
    // Load saved subject filter from localStorage, default to 'all'
    return localStorage.getItem('triviaFilterSubject') || 'all';
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoOwnership, setVideoOwnership] = useState(null);
  const [lastViewedVideoId, setLastViewedVideoId] = useState(null);  const [playlists, setPlaylists] = useState([]);
  const [playlistSearchTerm, setPlaylistSearchTerm] = useState('');  const [filterPlaylist, setFilterPlaylist] = useState(() => {
    // Load saved playlist filter from localStorage, default to empty array for multi-select
    const savedPlaylists = localStorage.getItem('triviaFilterPlaylist');
    if (savedPlaylists && savedPlaylists !== 'all') {
      try {
        return JSON.parse(savedPlaylists); // Try to parse as JSON array
      } catch (e) {
        return [savedPlaylists]; // If it's not JSON, treat as single string and convert to array
      }
    }
    return [];
  });
  const [showPlaylistSuggestions, setShowPlaylistSuggestions] = useState(false);
  const [playlistSuggestions, setPlaylistSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const playlistInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const videoRefs = useRef({});
  const navigate = useNavigate();  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load both video metadata and user info in parallel
        const [triviaData, userInfoResponse] = await Promise.all([
          fetchTriviaData(),
          fetchUserInfo()
        ]);

        // Handle video data
        const ownership = getVideoOwnership(triviaData);
        setVideoOwnership(ownership);
        
        const videosArray = [...ownership.ownedVideos, ...ownership.otherVideos];
        localStorage.setItem('triviaVideos', JSON.stringify(videosArray));
        setVideos(videosArray);
        
        // Extract and set subjects
        const uniqueSubjects = [...new Set(videosArray.map(video => video.subject))];
        setSubjects(uniqueSubjects);        // Extract playlists from the response data
        const extractedPlaylists = extractPlaylists(triviaData);
        console.log('Extracted playlists:', extractedPlaylists);
        
        if (extractedPlaylists.length === 0) {
          console.warn('No playlists were extracted. Showing an error message might be appropriate.');
          // You could set some state to show a warning to the user
        }
        
        setPlaylists(extractedPlaylists);

        // Handle user info
        console.log('User info loaded:', userInfoResponse);
        setUserInfo(userInfoResponse);

        // Check if there's a saved subject filter that needs to be validated
        const savedSubjectFilter = localStorage.getItem('triviaFilterSubject');
        if (savedSubjectFilter && savedSubjectFilter !== 'all' && !uniqueSubjects.includes(savedSubjectFilter)) {
          // If the saved subject filter is no longer valid, reset it to 'all'
          setFilterSubject('all');
          localStorage.setItem('triviaFilterSubject', 'all');
        }

        // Set initial filtered videos after both data are loaded
        const initialFiltered = videosArray.filter(video => {
          console.log("video?.upload_by == fullName", video?.upload_by);

          // Apply owner filter
          if (filterOwner !== 'all') {
            const fullName = `${userInfoResponse['first name']} ${userInfoResponse['last name']}`;
            const isOwnedByUser = video?.upload_by === fullName;
            if (filterOwner === 'me' && !isOwnedByUser) return false;
            if (filterOwner === 'others' && isOwnedByUser) return false;
          }

          // Apply subject filter
          if (filterSubject !== 'all' && video?.subject !== filterSubject) {
            return false;
          }

          return true;
        });
        setFilteredVideos(initialFiltered);        // Check if we have a last viewed video ID in localStorage
        const lastViewedId = localStorage.getItem('lastViewedVideoId');
        if (lastViewedId) {
          setLastViewedVideoId(lastViewedId);
          // Clear it from localStorage after retrieving it
          localStorage.removeItem('lastViewedVideoId');
        }
          // If we have a saved playlist filter, we don't want to set it as the search term anymore
        // We'll just display the selected playlists in the tags area
        const savedPlaylistFilter = localStorage.getItem('triviaFilterPlaylist');
        if (savedPlaylistFilter && savedPlaylistFilter !== 'all') {
          try {
            // We're parsing but not setting it to playlistSearchTerm anymore
            JSON.parse(savedPlaylistFilter);
          } catch (e) {
            // For backward compatibility
            console.log('Could not parse playlist filter as JSON:', e);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array as this should only run once  // Modify the filter effect to only run when we have both videos and user info
  useEffect(() => {
    if (!videos.length || !videoOwnership) return; // Don't run if we don't have both

    const filteredResult = filterVideos(videos, {
      searchTerm,
      filterOwner,
      filterSubject,
      filterPlaylist,
      userInfo,
      videoOwnership,
      playlists
    });

    setFilteredVideos(filteredResult);
  }, [searchTerm, filterOwner, filterSubject, filterPlaylist, videos, videoOwnership, userInfo, playlists]);// Effect to scroll to the last viewed video when the component is fully rendered
  useEffect(() => {
    if (lastViewedVideoId && !isLoading && filteredVideos.length > 0) {
      // Find the reference to the video card for the last viewed video
      const videoRef = videoRefs.current[lastViewedVideoId];
      if (videoRef) {
        // Scroll the video card into view with a smooth animation
        videoRef.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Highlight the video card temporarily
        videoRef.classList.add('highlight-video');
        setTimeout(() => {
          videoRef.classList.remove('highlight-video');
        }, 2000);
      }
    }
  }, [lastViewedVideoId, isLoading, filteredVideos]);
    // Effect to update playlist suggestions based on search term
  useEffect(() => {
    if (playlistSearchTerm.trim() === '') {
      setPlaylistSuggestions([]);
      return;
    }
    
    console.log('Searching playlists:', playlistSearchTerm);
    console.log('Available playlists:', playlists);
    
    const filtered = playlists.filter(playlist => 
      playlist.playlist_name.toLowerCase().includes(playlistSearchTerm.toLowerCase())
    );
    
    console.log('Filtered playlists:', filtered);
    setPlaylistSuggestions(filtered);
  }, [playlistSearchTerm, playlists]);

  // Handle clicks outside the playlist suggestions to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        playlistInputRef.current && 
        !playlistInputRef.current.contains(event.target)
      ) {
        setShowPlaylistSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Handle keyboard navigation in playlist suggestions
  const handlePlaylistKeyDown = (e) => {
    if (!showPlaylistSuggestions) return;
    
    // ArrowDown key
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < playlistSuggestions.length - 1 ? prev + 1 : prev
      );
    }
    // ArrowUp key
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : 0));
    }
    // Enter key
    else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedPlaylist = playlistSuggestions[activeSuggestionIndex];
      if (selectedPlaylist) {
        // Save current scroll position
        const scrollPosition = window.scrollY;
        
        // Only add if not already selected
        if (!filterPlaylist.includes(selectedPlaylist.playlist_name)) {
          const newPlaylists = [...filterPlaylist, selectedPlaylist.playlist_name];
          setFilterPlaylist(newPlaylists);
          localStorage.setItem('triviaFilterPlaylist', JSON.stringify(newPlaylists));
        }
        
        // Clear search term after selection
        setPlaylistSearchTerm('');
        setShowPlaylistSuggestions(false);
        
        // Reset lastViewedVideoId to prevent scrolling
        setLastViewedVideoId(null);
        
        // Restore scroll position
        setTimeout(() => {
          window.scrollTo({
            top: scrollPosition,
            behavior: 'auto'
          });
        }, 0);
      }
    }
    // Escape key
    else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPlaylistSuggestions(false);
    }
  };
  const handleClearFilters = () => {
    // Save current scroll position
    const scrollPosition = window.scrollY;
    
    setSearchTerm('');
    setFilterOwner('all');
    setFilterSubject('all');
    setFilterPlaylist([]);
    setPlaylistSearchTerm('');
    setLastViewedVideoId(null); // Clear the last viewed video ID to prevent scrolling
    localStorage.setItem('triviaFilterOwner', 'all');
    localStorage.setItem('triviaFilterSubject', 'all');
    localStorage.setItem('triviaFilterPlaylist', JSON.stringify([]));
    localStorage.removeItem('lastViewedVideoId'); // Also remove from localStorage to be thorough
    
    // Restore scroll position
    setTimeout(() => {
      window.scrollTo({
        top: scrollPosition,
        behavior: 'auto'
      });
    }, 0);
  };

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
      <div className="trivia-container">          <div className="filters">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={filterOwner} 
            onChange={(e) => {
              const newValue = e.target.value;
              setFilterOwner(newValue);
              // Save the selection to localStorage
              localStorage.setItem('triviaFilterOwner', newValue);
            }}
            className="filter-select"
          >
            <option value="all">All Videos</option>
            <option value="me">My Videos</option>
            <option value="others">Other's Videos</option>
          </select>

          <select 
            value={filterSubject} 
            onChange={(e) => {
              const newValue = e.target.value;
              setFilterSubject(newValue);
              // Save the selection to localStorage
              localStorage.setItem('triviaFilterSubject', newValue);
            }}
            className="filter-select"
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          
          {/* Only show the Clear Filters button when some filter is active */}
          {(searchTerm || filterOwner !== 'all' || filterSubject !== 'all' || filterPlaylist !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}          {/* Playlist filter moved below other filters */}
          <div className="playlist-search-container">
            <div className="playlist-search-input-wrapper">              <input
                type="text"
                placeholder="Search and add playlists..."
                value={playlistSearchTerm || ''}
                onChange={(e) => {
                  setPlaylistSearchTerm(e.target.value);
                  setActiveSuggestionIndex(-1);
                  setShowPlaylistSuggestions(true);
                  
                  // Reset lastViewedVideoId to prevent scrolling
                  setLastViewedVideoId(null);
                  
                  // If clearing the field, we don't reset selected playlists anymore
                  // as the user might want to add multiple playlists
                }}
                onFocus={() => setShowPlaylistSuggestions(true)}
                onKeyDown={handlePlaylistKeyDown}
                className={`search-input playlist-search ${filterPlaylist.length > 0 ? 'active-filter' : ''}`}
                ref={playlistInputRef}
              />
              {playlistSearchTerm && (
                <span 
                  className="playlist-filter-indicator" 
                  title="Search playlists"
                >
                  🔍
                </span>
              )}
            </div>
            
            {/* Display selected playlists as tags */}
            {filterPlaylist.length > 0 && (
              <div className="selected-playlists-container">
                {filterPlaylist.map((playlist, index) => (
                  <div key={index} className="playlist-tag">
                    {playlist}
                    <span 
                      className="playlist-tag-remove" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Save current scroll position
                        const scrollPosition = window.scrollY;
                        
                        // Remove the playlist from selected playlists
                        const newPlaylists = filterPlaylist.filter((_, i) => i !== index);
                        setFilterPlaylist(newPlaylists);
                        localStorage.setItem('triviaFilterPlaylist', JSON.stringify(newPlaylists));
                        
                        // Explicitly set lastViewedVideoId to null to prevent scrolling
                        setLastViewedVideoId(null);
                        
                        // Restore scroll position
                        setTimeout(() => {
                          window.scrollTo({
                            top: scrollPosition,
                            behavior: 'auto'
                          });
                        }, 0);
                      }}
                    >
                      ✕
                    </span>
                  </div>
                ))}
                <div 
                  className="clear-all-playlists"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Save current scroll position
                    const scrollPosition = window.scrollY;
                    
                    // Clear all selected playlists
                    setFilterPlaylist([]);
                    localStorage.setItem('triviaFilterPlaylist', JSON.stringify([]));
                    
                    // Explicitly set lastViewedVideoId to null to prevent scrolling
                    setLastViewedVideoId(null);
                    
                    // Restore scroll position
                    setTimeout(() => {
                      window.scrollTo({
                        top: scrollPosition,
                        behavior: 'auto'
                      });
                    }, 0);
                  }}
                >
                  Clear All
                </div>
              </div>
            )}
              
            {showPlaylistSuggestions && (
              <div className="playlist-suggestions" ref={suggestionsRef}>
                {playlistSuggestions.length > 0 ? (
                  playlistSuggestions.map((playlist, index) => (
                    <div 
                      key={playlist.playlist_id} 
                      className={`playlist-suggestion-item ${index === activeSuggestionIndex ? 'active' : ''} ${filterPlaylist.includes(playlist.playlist_name) ? 'already-selected' : ''}`}
                      onClick={() => {
                        // Save current scroll position
                        const scrollPosition = window.scrollY;
                        
                        // Only add if not already selected
                        if (!filterPlaylist.includes(playlist.playlist_name)) {
                          const newPlaylists = [...filterPlaylist, playlist.playlist_name];
                          setFilterPlaylist(newPlaylists);
                          localStorage.setItem('triviaFilterPlaylist', JSON.stringify(newPlaylists));
                        }
                        
                        // Clear search term after selection
                        setPlaylistSearchTerm('');
                        setShowPlaylistSuggestions(false);
                        
                        // Explicitly set lastViewedVideoId to null to prevent scrolling
                        setLastViewedVideoId(null);
                        
                        // Restore scroll position
                        setTimeout(() => {
                          window.scrollTo({
                            top: scrollPosition,
                            behavior: 'auto'
                          });
                        }, 0);
                      }}
                    >
                      <span>{playlist.playlist_name}</span>
                      {filterPlaylist.includes(playlist.playlist_name) && <span className="already-added">✓</span>}
                    </div>
                  ))
                ) : (
                  <div className="playlist-suggestion-item no-results">
                    {playlistSearchTerm.trim() !== '' ? 'No matching playlists found' : 'Type to search playlists'}
                  </div>
                )}
              </div>
            )}
          </div>
            {/* Only show the Clear Filters button when some filter is active */}
          {(searchTerm || filterOwner !== 'all' || filterSubject !== 'all' || filterPlaylist.length > 0) && (
            <button 
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="videos-grid">
          {filteredVideos.map(video => (
            <div 
              key={video?.video_id || Math.random()} 
              className={`video-card ${lastViewedVideoId === video.video_id ? 'last-viewed' : ''}`}
              ref={el => videoRefs.current[video.video_id] = el}
            >
              <img 
                src={video?.external_id ? `https://img.youtube.com/vi/${video.external_id}/hqdefault.jpg` : ''} 
                alt={video?.video_name || 'Untitled'} 
                onClick={() => handleVideoSelect(video)}
              />
              <div className="video-info">
                <h3>{video?.video_name || 'Untitled'}</h3>
                <p>Subject: {video?.subject || 'Unknown'}</p>
                <p>By: {video?.upload_by || 'Unknown'}</p>
                
                <div className="video-actions">
                  <button 
                    className="quiz-btn"
                    onClick={() => handleVideoSelect(video)}
                  >
                    <span role="img" aria-label="quiz">❓</span> Quiz
                  </button>
                  <button 
                    className="summary-btn"
                    onClick={() => navigate(`/trivia/${video.video_id}/summary`)}
                  >
                    <span role="img" aria-label="summary">📝</span> Summary
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Trivia;
