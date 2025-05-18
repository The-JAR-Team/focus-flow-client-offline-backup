import axios from 'axios';
import { config } from '../config/config';
import { notifyFavoritesChanged } from './favoritesCache';

// Global favorites data to avoid duplicate fetches
let globalFavoritesPromise = null;
let isRefreshingFavorites = false;

// Get all groups for the current user
export const fetchGroups = async () => {
  try {
    const response = await axios.get(`${config.baseURL}/groups`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

// Get all groups for the current user, including their items (playlists and videos).
export const getAllUserGroupsWithItems = async () => {
  try {
    const response = await axios.get(`${config.baseURL}/group`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching all user groups with items:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Failed to fetch groups');
  }
};

// Get the names of all groups for the current user.
export const getUserGroupNames = async () => {
  try {
    const response = await axios.get(`${config.baseURL}/group/names`, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Error fetching user group names:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Failed to fetch group names');
  }
};

// Get a specific group by name
export const fetchGroupByName = async (groupName) => {
  try {
    if (groupName === 'favorites') {
      if (isRefreshingFavorites && globalFavoritesPromise) {
        console.log('Favorites refresh in progress, returning existing promise');
        return await globalFavoritesPromise;
      }
      
      if (!isRefreshingFavorites && globalFavoritesPromise) {
        console.log('Using cached favorites data');
        return await globalFavoritesPromise; 
      }

      console.log(`Fetching group '${groupName}' from API (new request or cache invalidated)`);
      isRefreshingFavorites = true;
      globalFavoritesPromise = axios.get(`${config.baseURL}/group/${encodeURIComponent(groupName)}`, { withCredentials: true })
        .then(response => {
          isRefreshingFavorites = false;
          return response.data; 
        })
        .catch(error => {
          isRefreshingFavorites = false;
          globalFavoritesPromise = null;
          console.error(`Error fetching group ${groupName}:`, error);
          throw error; 
        });
      return await globalFavoritesPromise;
    }
    
    console.log(`Fetching non-favorites group '${groupName}' from API`);
    const response = await axios.get(`${config.baseURL}/group/${encodeURIComponent(groupName)}`, { withCredentials: true });
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
    if (groupData.group_name === 'favorites') {
      isRefreshingFavorites = false;
      globalFavoritesPromise = Promise.resolve({ data: { group: response.data, status: 'success'} });
      notifyFavoritesChanged();
    }
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
        item_type: itemType,
        item_id: itemId
      },
      { withCredentials: true }
    );
    if (groupName === 'favorites') {
      refreshFavorites();
      notifyFavoritesChanged();
    }
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
    if (groupName === 'favorites') {
      refreshFavorites();
      notifyFavoritesChanged();
    }
    return response.data;
  } catch (error) {
    console.error(`Error removing ${itemType} from group ${groupName}:`, error);
    throw error;
  }
};

// Switch the order of two items within a group.
export const switchGroupItemOrder = async (groupName, itemType, order1, order2) => {
  try {
    const response = await axios.patch(
      `${config.baseURL}/group/items/switch_order`,
      {
        group_name: groupName,
        item_type: itemType,
        order1: order1,
        order2: order2,
      },
      { withCredentials: true }
    );
    if (groupName === 'favorites') {
      refreshFavorites();
      notifyFavoritesChanged();
    }
    return response.data;
  } catch (error) {
    console.error(`Error switching item order in group '${groupName}':`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Failed to switch item order');
  }
};

// Deletes a specific group by its name.
export const deleteGroup = async (groupName) => {
  try {
    const response = await axios.delete(`${config.baseURL}/group/${encodeURIComponent(groupName)}`, { withCredentials: true });
    if (groupName === 'favorites') {
      refreshFavorites();
      notifyFavoritesChanged();
    }
    return response.data;
  } catch (error) {
    console.error(`Error deleting group '${groupName}':`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error(`Failed to delete group '${groupName}'`);
  }
};

// Initialize favorites group
export const initializeFavorites = async () => {
  try {
    try {
      const favoritesResponse = await fetchGroupByName('favorites');
      if (favoritesResponse.status === 'success') {
        return favoritesResponse.group;
      }
    } catch (error) {
      if (error.response?.data?.status === 'failed' && 
          error.response?.data?.reason?.includes('not found')) {
        const createResponse = await createGroup({
          group_name: 'favorites',
          description: 'favorites'
        });
        
        if (createResponse.status === 'success') {
          return {
            ...createResponse,
            playlists: [],
            videos: []
          };
        }
      }
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
    await initializeFavorites(); 
    
    const favoritesResponse = await fetchGroupByName('favorites');
    
    if (favoritesResponse.status === 'success') {
      const favorites = favoritesResponse.group;
      const isPlaylistInFavorites = favorites.playlists && favorites.playlists.some(p => p.playlist_id === playlist.playlist_id);
      
      if (isPlaylistInFavorites) {
        const removeResult = await removeItemFromGroup('favorites', 'playlist', playlist.playlist_id);
        console.log("Removed from favorites:", removeResult);
        
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'removed',
          message: `Removed playlist ${playlist.playlist_name} from favorites` 
        };
      } else {
        const addResult = await addItemToGroup('favorites', 'playlist', playlist.playlist_id);
        console.log("Added to favorites:", addResult);
        
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
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
    if (error.response?.data?.status === 'failed' && 
        error.response?.data?.reason?.includes('not found')) {
      try {
        await initializeFavorites();
        await addItemToGroup('favorites', 'playlist', playlist.playlist_id);
        
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
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
    await initializeFavorites();

    const favoritesResponse = await fetchGroupByName('favorites');
    
    if (favoritesResponse.status === 'success') {
      const favorites = favoritesResponse.group;
      const isVideoInFavorites = favorites.videos && favorites.videos.some(v => v.video_id === video.video_id);
      if (isVideoInFavorites) {
        await removeItemFromGroup('favorites', 'video', video.video_id);
        
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'removed',
          message: `Removed video ${video.name} from favorites` 
        };
      } else {
        await addItemToGroup('favorites', 'video', video.video_id);
        
        isRefreshingFavorites = true;
        globalFavoritesPromise = null;
        
        notifyFavoritesChanged();
        
        return { 
          status: 'success', 
          action: 'added',
          message: `Added video ${video.name} to favorites` 
        };
      }
    } else {
      throw new Error('Failed to get favorites group');
    }
  } catch (error) {
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
