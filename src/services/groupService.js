// Offline group service: implement a localStorage-backed 'favorites' group only
import { notifyFavoritesChanged } from './favoritesCache';
import { fetchVideoMetadata } from './videos';

// Global favorites data to avoid duplicate fetches
let isRefreshingFavorites = false;

const FAVORITES_STORAGE_KEY = 'offline_favorites_playlist_ids';

const readFavoritesIds = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

const writeFavoritesIds = (ids) => {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // ignore
  }
};

// Get all groups for the current user
export const fetchGroups = async () => {
  // Offline: only favorites group exists
  const favorites = await fetchGroupByName('favorites');
  return { status: 'success', groups: [favorites.group] };
};

// Get all groups for the current user, including their items (playlists and videos).
export const getAllUserGroupsWithItems = async () => {
  const favorites = await fetchGroupByName('favorites');
  return { status: 'success', groups: [favorites.group] };
};

// Get the names of all groups for the current user.
export const getUserGroupNames = async () => {
  return { status: 'success', groups: ['favorites'] };
};

// Get a specific group by name
export const fetchGroupByName = async (groupName) => {
  if (groupName !== 'favorites') {
    return { status: 'failed', reason: 'Offline mode supports only favorites group' };
  }
  // Build favorites group from localStorage + accessible playlists
  const ids = readFavoritesIds();
  const data = await fetchVideoMetadata();
  const playlists = (data.playlists || []).filter(p => ids.includes(p.playlist_id));
  const group = {
    group_id: 1,
    group_name: 'favorites',
    description: 'favorites',
    playlists,
    videos: [],
    updated_at: new Date().toISOString()
  };
  return { status: 'success', group };
};

// Create a new group
export const createGroup = async (groupData) => {
  if ((groupData.group_name || '').toLowerCase() !== 'favorites') {
    return { status: 'failed', reason: 'Custom groups are not available offline' };
  }
  // Initialize favorites store if needed
  writeFavoritesIds(readFavoritesIds());
  notifyFavoritesChanged();
  return { status: 'success', message: 'Favorites initialized' };
};

// Add an item to a group
export const addItemToGroup = async (groupName, itemType, itemId) => {
  if (groupName !== 'favorites' || itemType !== 'playlist') {
    return { status: 'failed', reason: 'Only playlist favorites supported offline' };
  }
  const ids = readFavoritesIds();
  if (!ids.includes(itemId)) ids.push(itemId);
  writeFavoritesIds(ids);
  notifyFavoritesChanged();
  return { status: 'success', message: 'Added to favorites' };
};

// Remove an item from a group
export const removeItemFromGroup = async (groupName, itemType, itemId) => {
  if (groupName !== 'favorites' || itemType !== 'playlist') {
    return { status: 'failed', reason: 'Only playlist favorites supported offline' };
  }
  const ids = readFavoritesIds().filter(id => id !== itemId);
  writeFavoritesIds(ids);
  notifyFavoritesChanged();
  return { status: 'success', message: 'Removed from favorites' };
};

// Switch the order of two items within a group.
export const switchGroupItemOrder = async (groupName, itemType, order1, order2) => {
  return { status: 'failed', reason: 'Ordering not supported offline' };
};

// Deletes a specific group by its name.
export const deleteGroup = async (groupName) => {
  if (groupName !== 'favorites') {
    return { status: 'failed', reason: 'Custom groups not supported offline' };
  }
  // Clear favorites
  writeFavoritesIds([]);
  notifyFavoritesChanged();
  return { status: 'success', message: 'Favorites cleared' };
};

// Initialize favorites group
export const initializeFavorites = async () => {
  writeFavoritesIds(readFavoritesIds());
  const res = await fetchGroupByName('favorites');
  return res.group;
};

// Toggle playlist in favorites (add if not present, remove if present)
export const togglePlaylistInFavorites = async (playlist) => {
  await initializeFavorites(); 
  const favoritesResponse = await fetchGroupByName('favorites');
  if (favoritesResponse.status !== 'success') {
    return { status: 'failed', reason: 'Failed to read favorites' };
  }
  const favorites = favoritesResponse.group;
  const isPlaylistInFavorites = favorites.playlists && favorites.playlists.some(p => p.playlist_id === playlist.playlist_id);
  if (isPlaylistInFavorites) {
    await removeItemFromGroup('favorites', 'playlist', playlist.playlist_id);
    isRefreshingFavorites = true;
    notifyFavoritesChanged();
    return { status: 'success', action: 'removed', message: `Removed playlist ${playlist.playlist_name} from favorites` };
  } else {
    await addItemToGroup('favorites', 'playlist', playlist.playlist_id);
    isRefreshingFavorites = true;
    notifyFavoritesChanged();
    return { status: 'success', action: 'added', message: `Added playlist ${playlist.playlist_name} to favorites` };
  }
};

// Toggle video in favorites
export const toggleVideoInFavorites = async (video) => {
  return { status: 'failed', reason: 'Video favorites not supported offline' };
};

// Force a refresh of the favorites data
export const refreshFavorites = () => {
  isRefreshingFavorites = true;
  console.log('Favorites refresh requested for next fetch');
};
