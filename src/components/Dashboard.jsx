import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import EyeDebugger from './EyeDebugger';
import '../styles/Dashboard.css';
import StackedThumbnails from './StackedThumbnails';
import Spinner from './Spinner';
import FavoritesStar from './FavoritesStar';
import FavoritesList from './FavoritesList';
import { subscribeFavorites } from '../services/favoritesCache';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedPlaylist } from '../redux/playlistSlice';
import { setDashboardData } from '../redux/dashboardSlice';
import { initializeDashboardData } from '../services/dashboardService';
import { getAllUserGroupsWithItems } from '../services/groupService';

function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [eyeDebuggerOn, setEyeDebuggerOn] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState(null);  
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'pause');
  const [error, setError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    myPlaylists: true,
    publicPlaylists: true,
    myVideos: true,
    publicVideos: true
  });
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set(['favorites']));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const { currentUser } = useSelector(state => state.user);
  const dashboardState = useSelector(state => state.dashboard);
  console.log('[Dashboard.jsx] dashboardState from useSelector:', dashboardState);

  const {
    myGenericVideos = [], 
    otherGenericVideos = [], 
    myPlaylists = [], 
    otherPlaylists = [], 
    isLoaded
  } = dashboardState || {}; // Ensure dashboardState itself is not undefined before destructuring
  useEffect(() => {
    console.log('[Dashboard.jsx] myGenericVideos after destructuring:', myGenericVideos);
    setTimeout(() => setEyeDebuggerOn(false), 5000);
  }, []);

  // Initialize dashboard data on component mount
  useEffect(() => {
    if (currentUser && !isLoaded) {
      refreshDashboard();
    }
  }, [currentUser]);
  // Fetch user groups
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        if (currentUser) {
          const response = await getAllUserGroupsWithItems();
          if (response && response.groups) {
            setUserGroups(response.groups);
            console.log('[Dashboard.jsx] User groups fetched:', response.groups);
            
            // Initialize expandedSections for each group (collapsed by default)
            const newExpandedSections = {...expandedSections};
            response.groups.forEach(group => {
              if (group.group_name === 'favorites') {
                newExpandedSections[group.group_name] = true; // favorites expanded by default
              } else {
                newExpandedSections[group.group_name] = false; // other groups collapsed by default
              }
            });
            setExpandedSections(newExpandedSections);
          }
        }
      } catch (error) {
        console.error('Error fetching user groups:', error);
      }
    };

    fetchUserGroups();
  }, [currentUser]);

  useEffect(() => {
    if (selectedVideo) {
      console.log("[DEBUG] Attempting to load video:", selectedVideo.external_id, selectedVideo.subject);
    }
  }, [selectedVideo]);
  const handlePlaylistClick = (playlist) => {
    dispatch(setSelectedPlaylist(playlist));
    navigate(`/playlist/${playlist.playlist_id}`);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  const toggleGroupSelection = (groupName) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const refreshDashboard = async (e) => {
    try {
      // Force refresh of favorites data
      const groupService = await import('../services/groupService');
      if (groupService.refreshFavorites) {
        groupService.refreshFavorites();
      }

      // Fetch dashboard data
      console.log('[Dashboard.jsx] Calling initializeDashboardData');
      const dashboardData = await initializeDashboardData(currentUser);
      console.log('[Dashboard.jsx] Data from initializeDashboardData:', dashboardData);

      dispatch(setDashboardData({
        myGenericVideos: dashboardData.myGenericVideos,
        otherGenericVideos: dashboardData.otherGenericVideos,
        myPlaylists: dashboardData.myPlaylists,
        otherPlaylists: dashboardData.otherPlaylists
      }));
      console.log('[Dashboard.jsx] Dispatched setDashboardData');
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  }

  const groups = ['All Lectures', ...new Set(videos.map(v => v.group))];
  const filteredVideos = selectedGroup === 'All Lectures'
    ? videos
    : videos.filter(v => v.group === selectedGroup);

  if (!isLoaded) {
    return (
      <div className="loading-overlay">
        <Spinner size="large" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        {currentUser ? (
          <>
            <div className="user-greeting">
              <h1>Hello {currentUser.first_name} {currentUser.last_name}</h1>
            </div>
            <button className="back-button" onClick={() => refreshDashboard()}>
              Refresh Dashboard
            </button>
          </>
        ) : (
          <div className="login-prompt">
            <p>{error || 'No user logged in.'}</p>
            <p>
              Please <button onClick={() => navigate('/')}>Log in</button> or <button onClick={() => navigate('/register')}>Register</button>.
            </p>
          </div>
        )}
        {!selectedVideo ? (
          <>            <div className="controls-row">
              <div className="mode-selector">
                <button
                  className={`mode-button ${mode === 'pause' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('pause');
                    localStorage.setItem('mode', 'pause');
                  }}
                >
                  Pause Mode
                </button>
                <button
                  className={`mode-button ${mode === 'question' ? 'active' : ''}`}
                  onClick={() => {
                    setMode('question');
                    localStorage.setItem('mode', 'question');
                  }}
                >
                  Question Mode
                </button>
              </div>            
            </div>
            
            {/* Group Selection Checkboxes */}
            <div className="group-selection-container">
              <h3>My Groups</h3>
              <div className="group-checkboxes">
                {userGroups.map(group => (
                  <label key={group.group_id} className="group-checkbox-label">
                    <input
                      type="checkbox"
                      className="group-checkbox"
                      checked={selectedGroups.has(group.group_name)}
                      onChange={() => toggleGroupSelection(group.group_name)}
                    />
                    <span className="group-checkbox-text">{group.group_name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Favorites Section */}
            <FavoritesList 
              expanded={expandedSections.favorites} 
              toggleExpand={() => toggleSection('favorites')} 
            />
            
            {/* Dynamic Group Sections */}
            {userGroups.map(group => {
              // Skip "favorites" as it's already shown through FavoritesList
              if (group.group_name === 'favorites' || !selectedGroups.has(group.group_name)) return null;
              
              return (
                <div key={group.group_id} className="dashboard-section">
                  <div className="section-header">
                    <h2 
                      onClick={() => toggleSection(group.group_name)} 
                      className="collapsible-header"
                    >
                      {group.group_name}
                      <span className={`arrow ${expandedSections[group.group_name] ? 'expanded' : ''}`}>▼</span>
                    </h2>
                  </div>
                  
                  <div className={`collapsible-content ${expandedSections[group.group_name] ? 'expanded' : ''}`}>
                    {/* Playlists in Group Section */}
                    {group.playlists && group.playlists.length > 0 && (
                      <div>
                        <h3>Playlists</h3>
                        <div className="content-grid group-playlists-grid">
                          {group.playlists.map(playlist => (
                            <div 
                              className="playlist-card" 
                              key={playlist.playlist_id}
                              onClick={() => handlePlaylistClick({...playlist, playlist_id: playlist.playlist_id})}
                            >
                              <h4>{playlist.playlist_name}</h4>
                              <div className="playlist-info">
                                <p>Permission: {playlist.permission}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Videos in Group Section */}
                    {group.videos && group.videos.length > 0 && (
                      <div>
                        <h3>Videos</h3>
                        <div className="content-grid group-videos-grid">
                          {group.videos.map(video => (
                            <div 
                              className="video-card" 
                              key={video.video_id} 
                              onClick={() => handleVideoSelect({
                                external_id: video.youtube_id,
                                subject: video.description,
                                length: video.length
                              })}
                            >
                              <h4>{video.name}</h4>
                              <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.description} />
                              <div className="video-info">
                                <h5>Subject: {video.description}</h5>
                                <small>Length: {video.length}</small>
                                <small>Uploaded by: {video.upload_by}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {group.playlists.length === 0 && group.videos.length === 0 && (
                      <div className="empty-section-message">
                        No items in this group yet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* My Playlists Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('myPlaylists')} className="collapsible-header">
                  My Playlists
                  <span className={`arrow ${expandedSections.myPlaylists ? 'expanded' : ''}`}>▼</span>
                </h2>              
              </div>              
              <div className={`collapsible-content ${expandedSections.myPlaylists ? 'expanded' : ''}`}>
                <div className="content-grid my-playlists-grid">                  
                  {myPlaylists.map(playlist => (
                    <div 
                      className="playlist-card" 
                      key={playlist.playlist_id}
                      onClick={() => handlePlaylistClick(playlist)}
                    >
                      <h4>{playlist.playlist_name}</h4>
                      <FavoritesStar 
                        playlist={playlist} 
                        onToggle={() => setForceUpdate(prev => !prev)} 
                      />
                      <StackedThumbnails videos={playlist.playlist_items} />
                      <div className="playlist-info">
                        <p>Permission: {playlist.playlist_permission}</p>
                        <p>Videos: {playlist.playlist_items.length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Public Playlists Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('publicPlaylists')} className="collapsible-header">
                  Public Playlists
                  <span className={`arrow ${expandedSections.publicPlaylists ? 'expanded' : ''}`}>▼</span>
                </h2>              
              </div>              
              <div className={`collapsible-content ${expandedSections.publicPlaylists ? 'expanded' : ''}`}>
                <div className="content-grid public-playlists-grid">                  
                  {otherPlaylists.map(playlist => (
                    <div 
                      className="playlist-card" 
                      key={playlist.playlist_id}
                      onClick={() => handlePlaylistClick(playlist)}
                    >
                      <h4>{playlist.playlist_name}</h4>
                      <FavoritesStar 
                        playlist={playlist} 
                        onToggle={() => setForceUpdate(prev => !prev)} 
                      />
                      <StackedThumbnails videos={playlist.playlist_items} />
                      <div className="playlist-info">
                        <p>Owner: {playlist.playlist_owner_name}</p>
                        <p>Permission: {playlist.playlist_permission}</p>
                        <p>Videos: {playlist.playlist_items.length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* My Videos Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('myVideos')} className="collapsible-header">
                  My Videos
                  <span className={`arrow ${expandedSections.myVideos ? 'expanded' : ''}`}>▼</span>
                </h2>              
              </div>
              <div className={`collapsible-content ${expandedSections.myVideos ? 'expanded' : ''}`}>
                <div className="content-grid my-videos-grid">
                  {myGenericVideos.map(video => (
                    <div className="video-card" key={video.video_id} onClick={() => handleVideoSelect(video)}>
                      <h4>{video.video_name}</h4>
                      <img src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`} alt={video.group} />
                      <div className="video-info">
                        <h5>Subject: {video.group}</h5>
                        <small>Length: {video.length}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Public Videos Section */}
            <div className="dashboard-section">
              <div className="section-header">
                <h2 onClick={() => toggleSection('publicVideos')} className="collapsible-header">
                  Public Videos
                  <span className={`arrow ${expandedSections.publicVideos ? 'expanded' : ''}`}>▼</span>
                </h2>              
              </div>
              <div className={`collapsible-content ${expandedSections.publicVideos ? 'expanded' : ''}`}>
                <div className="content-grid public-videos-grid">
                  {otherGenericVideos.map(video => (
                    <div className="video-card" key={video.video_id} onClick={() => handleVideoSelect(video)}>
                      <h4>{video.video_name}</h4>
                      <img src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`} alt={video.group} />
                      <div className="video-info">
                        <h5>Subject: {video.group}</h5>
                        <small>Uploaded by: {video.uploadby}</small><br />
                        <small>Length: {video.length}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setSelectedVideo(null)}>
              ← Back to Lectures
            </button>
            <VideoPlayer 
              mode={mode}
              lectureInfo={{
                videoId: selectedVideo.external_id,
                subject: selectedVideo.subject,
                videoDuration: selectedVideo.length,
              }}
                userInfo={{ name: `${currentUser.first_name} ${currentUser.last_name}`, profile: currentUser.profile }}
            />
          </>
        )}
      </div>
      <EyeDebugger enabled={eyeDebuggerOn} />
    </div>
  );
}

export default Dashboard;
