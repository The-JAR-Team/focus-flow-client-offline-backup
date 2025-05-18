import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGroupByName, initializeFavorites } from '../services/groupService';
import { fetchVideoMetadata } from '../services/videos';
import { subscribeFavorites } from '../services/favoritesCache';
import StackedThumbnails from './StackedThumbnails';
import FavoritesStar from './FavoritesStar';
import Spinner from './Spinner';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedPlaylist } from '../redux/playlistSlice';

const FavoritesList = ({ expanded, toggleExpand }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [favorites, setFavorites] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);const loadFavorites = useCallback(async () => {
    try {
      if (!expanded) return; // Don't load if section is collapsed
      
      setIsLoading(true);
      setError(null);
      
      // First try to get favorites group
      try {
        const response = await fetchGroupByName('favorites');
        if (response.status === 'success') {
          // We need complete playlist data for each favorited playlist
          const favoriteGroup = response.group;
          
          if (favoriteGroup.playlists && favoriteGroup.playlists.length > 0) {
            // Fetch all accessible videos/playlists to get complete data
            const allData = await fetchVideoMetadata();
            const allPlaylists = allData.playlists.filter(p => p.playlist_name !== 'generic');
            
            // Match favorite playlist IDs with complete playlist objects
            const completePlaylists = [];
            
            for (const favPlaylist of favoriteGroup.playlists) {
              const fullPlaylistData = allPlaylists.find(p => p.playlist_id === favPlaylist.playlist_id);
              
              if (fullPlaylistData) {
                completePlaylists.push(fullPlaylistData);
              } else {
                // If not found, just use the basic info we have
                completePlaylists.push(favPlaylist);
              }
            }
            
            // Update favorites with complete playlist data
            favoriteGroup.playlists = completePlaylists;
          }
          
          setFavorites(favoriteGroup);
        }
      } catch (err) {
        // If group doesn't exist, initialize it
        if (err.response?.data?.status === 'failed' && 
            err.response?.data?.reason?.includes('not found')) {
          const newFavorites = await initializeFavorites();
          setFavorites(newFavorites);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error("Error loading favorites:", err);
      setError("Could not load favorites");
    } finally {
      setIsLoading(false);
    }
  }, [expanded]);useEffect(() => {
    if (expanded) {
      loadFavorites();
    }
    
    // Subscribe to favorites changes to auto-update when changes occur
    const unsubscribe = subscribeFavorites(() => {
      if (expanded) {
        loadFavorites();
      }
    });
    
    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [expanded, loadFavorites]); // Reload when section is expanded
  const handlePlaylistClick = (playlist) => {
    if (!playlist || !playlist.playlist_id) {
      console.error("Invalid playlist data:", playlist);
      return;
    }
    
    dispatch(setSelectedPlaylist(playlist));
    navigate(`/playlist/${playlist.playlist_id}`);
  };

  // We don't need to force a reload anymore since we're using the subscription system
  const handleFavoriteToggle = (isAdded, playlistId) => {
    // The favorites list will be automatically updated via subscription
    // No need to manually reload
  };

  if (isLoading) {
    return (
      <div className="dashboard-section">
        <div className="section-header">
          <h2 onClick={toggleExpand} className="collapsible-header">
            Favorites
            <span className={`arrow ${expanded ? 'expanded' : ''}`}>▼</span>
          </h2>
        </div>
        <div className={`collapsible-content ${expanded ? 'expanded' : ''}`}>
          <Spinner size="medium" message="Loading favorites..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-section">
        <div className="section-header">
          <h2 onClick={toggleExpand} className="collapsible-header">
            Favorites
            <span className={`arrow ${expanded ? 'expanded' : ''}`}>▼</span>
          </h2>
        </div>
        <div className={`collapsible-content ${expanded ? 'expanded' : ''}`}>
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadFavorites}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <h2 onClick={toggleExpand} className="collapsible-header">
          Favorites
          <span className={`arrow ${expanded ? 'expanded' : ''}`}>▼</span>
        </h2>
      </div>
      <div className={`collapsible-content ${expanded ? 'expanded' : ''}`}>        {favorites?.playlists && favorites.playlists.length > 0 ? (          <div className="content-grid favorites-playlists-grid">
            {favorites.playlists.map(playlist => (              <div 
                className="playlist-card" 
                key={playlist.playlist_id}
                onClick={() => handlePlaylistClick(playlist)}
              >
                <h4>{playlist.playlist_name}</h4>
                <FavoritesStar playlist={playlist} />
                {playlist.playlist_items && playlist.playlist_items.length > 0 ? (
                  <StackedThumbnails videos={playlist.playlist_items} />
                ) : (
                  <div className="empty-thumbnails">
                    <p>No videos in playlist</p>
                  </div>
                )}
                <div className="playlist-info">
                  {playlist.playlist_owner_name && (
                    <p>Owner: {playlist.playlist_owner_name}</p>
                  )}
                  <p>Permission: {playlist.playlist_permission || 'Unknown'}</p>
                  <p>Videos: {playlist.playlist_items?.length || 0}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-section-message">
            <p>You haven't added any favorites yet. Click the star icon on playlists to add them here.</p>
            <button onClick={loadFavorites} className="refresh-button">Refresh</button>
          </div>
        )}
        
        {favorites?.videos && favorites.videos.length > 0 && (
          <div className="content-grid favorites-videos-grid">
            {favorites.videos.map(video => (
              <div className="video-card" key={video.video_id}>
                <h4>{video.name}</h4>
                <img src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.description} />
                <div className="video-info">
                  <h5>Description: {video.description}</h5>
                  <small>Length: {video.length}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesList;
