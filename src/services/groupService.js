import axios from 'axios';
import { config } from '../config/config';
import { notifyFavoritesChanged } from './favoritesCache';

// Global favorites data to avoid duplicate fetches
let globalFavoritesPromise = null;
let isRefreshingFavorites = false;

// Get all groups for the current user
export const fetchGroups = async () => {
  try {
    // This endpoint would need to be created on the backend
    const response = await axios.get(`${config.baseURL}/groups`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

// Get a specific group by name
export const fetchGroupByName = async (groupName) => {
  try {
    if (groupName === 'favorites') {
      // If a refresh is already in progress, return the existing promise for it
      if (isRefreshingFavorites && globalFavoritesPromise) {
        console.log('Favorites refresh in progress, returning existing promise');
        return await globalFavoritesPromise;
      }
      
      // If not currently refreshing, but we have a valid (non-null) promise, it's a cache hit.
      // This happens if globalFavoritesPromise was set by a previous successful fetch and not invalidated.
      if (!isRefreshingFavorites && globalFavoritesPromise) {
        console.log('Using cached favorites data');
        return await globalFavoritesPromise; 
      }

      // Otherwise (no active refresh, no valid cached promise OR cache was invalidated by setting globalFavoritesPromise to null)
      // We need to fetch.
      console.log(`Fetching group '${groupName}' from API (new request or cache invalidated)`);
      isRefreshingFavorites = true; // Mark that we are starting a refresh
      // Assign the promise to globalFavoritesPromise immediately
      globalFavoritesPromise = axios.get(`${config.baseURL}/group/${groupName}`, { withCredentials: true })
        .then(response => {
          isRefreshingFavorites = false; // Refresh complete
          return response.data; 
        })
        .catch(error => {
          isRefreshingFavorites = false; // Refresh failed
          globalFavoritesPromise = null; // Invalidate promise on error so next call retries
          console.error(`Error fetching group ${groupName}:`, error);
          throw error; 
        });
      return await globalFavoritesPromise; // Wait for the current fetch to complete
    }
    
    // For non-favorites groups, do normal request
    console.log(`Fetching non-favorites group '${groupName}' from API`);
    const response = await axios.get(`${config.baseURL}/group/${groupName}`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error(`Error in fetchGroupByName for ${groupName}:`, error);
    throw error;
  }
};

// Create a new group
export const createGroup = async (groupData) => {
  try {
    const response = await axios.post(
      `${config.baseURL}/group`,
      groupData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

// Add an item to a group
export const addItemToGroup = async (groupName, itemType, itemId) => {
  try {
    const response = await axios.post(
      `${config.baseURL}/group/items`,
      {
        group_name: groupName,
        item_type: itemType, // "playlist" or "video"
        item_id: itemId
      },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error(`Error adding ${itemType} to group ${groupName}:`, error);
    throw error;
  }
};

// Remove an item from a group
export const removeItemFromGroup = async (groupName, itemType, itemId) => {
  try {
    const response = await axios.delete(
      `${config.baseURL}/group/items`,
      { 
        data: {
          group_name: groupName,
          item_type: itemType,
          item_id: itemId
        },
        withCredentials: true 
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error removing ${itemType} from group ${groupName}:`, error);
    throw error;
  }
};

// Initialize favorites group
export const initializeFavorites = async () => {
  try {
    // Try to get the favorites group
    try {
      const favoritesResponse = await fetchGroupByName('favorites');
      if (favoritesResponse.status === 'success') {
        return favoritesResponse.group;
      }
    } catch (error) {
      // If favorites not found, create it
      if (error.response?.data?.status === 'failed' && 
          error.response?.data?.reason?.includes('not found')) {
        const createResponse = await createGroup({
          group_name: 'favorites',
          description: 'favorites'
        });
        
        if (createResponse.status === 'success') {
          // Return newly created favorites group
          return {
            group_id: createResponse.group_id,
            group_name: 'favorites',
            description: 'favorites',
            playlists: [],
            videos: []
          };
        }
      }
      // If it's another error, throw it
      throw error;
    }
  } catch (error) {
    console.error('Error initializing favorites:', error);
    throw error;
  }
};

// Toggle playlist in favorites (add if not present, remove if present)
export const togglePlaylistInFavorites = async (playlist) => {
  try {
    // First get the favorites group to check if playlist is already there
    const favoritesResponse = await fetchGroupByName('favorites');
    
    if (favoritesResponse.status === 'success') {
      const favorites = favoritesResponse.group;
      const isPlaylistInFavorites = favorites.playlists.some(p => p.playlist_id === playlist.playlist_id);        if (isPlaylistInFavorites) {        // Remove from favorites
        const removeResult = await removeItemFromGroup('favorites', 'playlist', playlist.playlist_id);
        console.log("Removed from favorites:", removeResult);
        
        // Force refresh on next fetch
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        // Notify subscribers about the change
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'removed',
          message: `Removed playlist ${playlist.playlist_name} from favorites` 
        };
      } else {        // Add to favorites
        const addResult = await addItemToGroup('favorites', 'playlist', playlist.playlist_id);
        console.log("Added to favorites:", addResult);
        
        // Force refresh on next fetch
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        // Notify subscribers about the change
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'added',
          message: `Added playlist ${playlist.playlist_name} to favorites` 
        };
      }
    } else {
      throw new Error('Failed to get favorites group');
    }
  } catch (error) {
    // If group doesn't exist, create it and add the playlist
    if (error.response?.data?.status === 'failed' && 
        error.response?.data?.reason?.includes('not found')) {      try {        await initializeFavorites();
        await addItemToGroup('favorites', 'playlist', playlist.playlist_id);
        
        // Force refresh on next fetch
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        // Notify subscribers about the change
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'added',
          message: `Added playlist ${playlist.playlist_name} to favorites` 
        };
      } catch (createError) {
        console.error('Error creating favorites group:', createError);
        throw createError;
      }
    }
    
    console.error('Error toggling playlist in favorites:', error);
    throw error;
  }
};

// Toggle video in favorites
export const toggleVideoInFavorites = async (video) => {
  try {
    // First get the favorites group to check if video is already there
    const favoritesResponse = await fetchGroupByName('favorites');
    
    if (favoritesResponse.status === 'success') {
      const favorites = favoritesResponse.group;
      const isVideoInFavorites = favorites.videos.some(v => v.video_id === video.video_id);        if (isVideoInFavorites) {        // Remove from favorites
        await removeItemFromGroup('favorites', 'video', video.video_id);
        
        // Force refresh on next fetch
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        // Notify subscribers about the change
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'removed',
          message: `Removed video ${video.name} from favorites` 
        };
      } else {        // Add to favorites
        await addItemToGroup('favorites', 'video', video.video_id);
        
        // Force refresh on next fetch
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        // Notify subscribers about the change
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'added',
          message: `Added video ${video.name} to favorites` 
        };
      }
    } else {
      throw new Error('Failed to get favorites group');
    }  } catch (error) {
    console.error('Error toggling video in favorites:', error);
    throw error;
  }
};

// Force a refresh of the favorites data
export const refreshFavorites = () => {
  isRefreshingFavorites = true;
  globalFavoritesPromise = null;
  console.log('Favorites refresh requested for next fetch');
};
