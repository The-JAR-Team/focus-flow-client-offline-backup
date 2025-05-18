import React, { useState, useEffect } from 'react';
import { fetchGroupByName, togglePlaylistInFavorites } from '../services/groupService';
import { subscribeFavorites } from '../services/favoritesCache';
import '../styles/FavoritesStar.css';

const FavoritesStar = ({ playlist, size = 'medium', onToggle = null }) => {
  // Local state for favorite status
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Check if this playlist is in favorites when component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      // Validate playlist data
      if (!playlist || !playlist.playlist_id) {
        console.error("Invalid playlist data provided to FavoritesStar:", playlist);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await fetchGroupByName('favorites');
        if (response.status === 'success') {
          const isInFavorites = response.group.playlists.some(
            p => p.playlist_id === playlist.playlist_id
          );
          setIsFavorite(isInFavorites);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial check
    checkFavoriteStatus();
    
    // Subscribe to favorites changes
    const unsubscribe = subscribeFavorites(() => {
      checkFavoriteStatus();
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [playlist.playlist_id]);
  
  const handleToggleFavorite = async (e) => {
    e.stopPropagation(); // Prevent triggering parent click events (like playlist selection)
    
    if (isLoading || !playlist || !playlist.playlist_id) return;
    
    // Optimistic UI update
    setIsFavorite(!isFavorite);
    
    try {
      // Update backend
      const result = await togglePlaylistInFavorites(playlist);
      
      // If callback provided, notify parent component of the change
      if (onToggle) {
        onToggle(result.action === 'added', playlist.playlist_id);
      }
    } catch (error) {
      // Revert UI state if operation failed
      console.error('Failed to toggle favorite status:', error);
      setIsFavorite(isFavorite);
      
      // Could add a toast notification here to inform the user
    }
  };
  
  const sizeClass = `star-${size}`;
  
  return (
    <div 
      className={`favorite-star ${sizeClass} ${isFavorite ? 'favorite' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleToggleFavorite}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      ★
    </div>
  );
};

export default FavoritesStar;
