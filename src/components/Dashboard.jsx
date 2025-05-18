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
  const [forceUpdate, setForceUpdate] = useState(false);  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    myPlaylists: true,
    publicPlaylists: true,
    myVideos: true,
    publicVideos: true
  });
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(() => {
    const savedGroups = localStorage.getItem('selectedGroups');
    return savedGroups ? new Set(JSON.parse(savedGroups)) : new Set(['favorites']);
  });


  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const { currentUser } = useSelector(state => state.user);
  const dashboardState = useSelector(state => state.dashboard);

  const {
    myGenericVideos = [], 
    otherGenericVideos = [], 
    myPlaylists = [], 
    otherPlaylists = [], 
    isLoaded  } = dashboardState || {}; // Ensure dashboardState itself is not undefined before destructuring
  useEffect(() => {
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
          const response = await getAllUserGroupsWithItems();          if (response && response.groups) {
            setUserGroups(response.groups);
            
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
  
    console.log('[Dashboard.jsx] dashboardState from useSelector:', dashboardState);

  // Print out the playlist IDs in the dashboardState for debugging
  useEffect(() => {
    if (dashboardState && dashboardState.myPlaylists) {
      console.log('[Dashboard.jsx] Available myPlaylists IDs:', 
        dashboardState.myPlaylists.map(p => p.playlist_id));
    }
    if (dashboardState && dashboardState.otherPlaylists) {
      console.log('[Dashboard.jsx] Available otherPlaylists IDs:', 
        dashboardState.otherPlaylists.map(p => p.playlist_id));
    }
  }, [dashboardState]);
  
  useEffect(() => {
    if (selectedVideo) {
      // Video selected, no action needed here
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
        // Auto-expand when checking a group
        setExpandedSections(prevExpanded => ({
          ...prevExpanded,
          [groupName]: true
        }));
      }
      // Save to localStorage
      localStorage.setItem('selectedGroups', JSON.stringify([...newSet]));
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
      const dashboardData = await initializeDashboardData(currentUser);

      dispatch(setDashboardData({
        myGenericVideos: dashboardData.myGenericVideos,
        otherGenericVideos: dashboardData.otherGenericVideos,
        myPlaylists: dashboardData.myPlaylists,
        otherPlaylists: dashboardData.otherPlaylists
      }));
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
            {selectedGroups.has('favorites') && (
              <FavoritesList 
                expanded={expandedSections.favorites} 
                toggleExpand={() => toggleSection('favorites')} 
              />
            )}
            
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
                          {group.playlists.map(playlist => {                            // Format playlist for consistent handling
                            const playlistObj = {
                              playlist_id: playlist.playlist_id,
                              playlist_name: playlist.playlist_name,
                              playlist_permission: playlist.permission,
                              playlist_owner_id: playlist.playlist_owner_id || currentUser.user_id,
                              playlist_owner_name: playlist.playlist_owner_name || currentUser.first_name + ' ' + currentUser.last_name,
                              playlist_items: playlist.playlist_items || []
                            };
                            
                            // Find the full playlist data from Redux store (either myPlaylists or otherPlaylists)
                            const fullPlaylistData = myPlaylists.find(p => p.playlist_id === playlistObj.playlist_id) || 
                                                    otherPlaylists.find(p => p.playlist_id === playlistObj.playlist_id);
                            
                            if (fullPlaylistData) {
                              // Use the complete data from store, but keep some properties from the group data
                              playlistObj.playlist_items = fullPlaylistData.playlist_items;
                              // Also copy any other useful properties from the full data
                              if (fullPlaylistData.description) {
                                playlistObj.description = fullPlaylistData.description;
                              }
                            }
                            
                            return (
                              <div 
                                className="playlist-card" 
                                key={playlist.playlist_id}
                                onClick={() => handlePlaylistClick(playlistObj)}
                              >
                                <h4>{playlist.playlist_name}</h4>                                <FavoritesStar 
                                  playlist={playlistObj}
                                  onToggle={() => setForceUpdate(prev => !prev)} 
                                />
                                {playlistObj.playlist_items ? (
                                  <StackedThumbnails videos={playlistObj.playlist_items} />
                                ) : (
                                  <div className="stacked-thumbnails empty-thumbnails" style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '8px', fontSize: '0.9rem' }}>No thumbnails</div>
                                  </div>
                                )}
                                <div className="playlist-info">
                                  {playlist.playlist_owner_name && (
                                    <p>Owner: {playlist.playlist_owner_name}</p>
                                  )}
                                  <p>Permission: {playlist.permission}</p>
                                  {playlist.description && <p>{playlist.description}</p>}
                                  {playlist.playlist_items && <p>Videos: {playlist.playlist_items.length}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Videos in Group Section */}
                    {group.videos && group.videos.length > 0 && (
                      <div>
                        <h3>Videos</h3>
                        <div className="content-grid group-videos-grid">
                          {group.videos.map(video => {                            // Format video for consistent handling
                            const videoObj = {
                              video_id: video.video_id,
                              external_id: video.youtube_id,
                              video_name: video.name,
                              subject: video.description,
                              group: video.description,
                              length: video.length,
                              uploadby: video.upload_by
                            };
                            
                            return (
                              <div 
                                className="video-card" 
                                key={video.video_id} 
                                onClick={() => handleVideoSelect(videoObj)}
                              >
                                <h4>{video.name}</h4>
                                <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.description} />
                                <div className="video-info">
                                  <h5>Subject: {video.description}</h5>
                                  <small>Length: {video.length}</small>
                                  {video.upload_by && <small>Uploaded by: {video.upload_by}</small>}
                                </div>
                              </div>
                            );
                          })}
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
