import axios from 'axios';
import { config } from '../config/config';

/**
 * Fetch user statistics including watch history, playlists, etc.
 * @returns {Promise<Object>} User statistics data
 */
export const fetchUserStats = async () => {
  try {
    // First get basic user info
    const userInfoResponse = await axios.get(
      `${config.baseURL}/user_info`,
      { withCredentials: true }
    );
    
    // Then get accessible videos which contains all playlists
    const accessibleVideosResponse = await axios.get(
      `${config.baseURL}/videos/accessible`,
      { withCredentials: true }
    );

    // Process and combine the data
    const userData = userInfoResponse.data.user;
    const videosData = accessibleVideosResponse.data;
    
    // Extract statistics from the data
    const stats = processUserStats(userData, videosData);
    
    return stats;
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw new Error('Failed to fetch user statistics');
  }
};

/**
 * Change user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Response data
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    // Note: This is a placeholder. The actual endpoint might be different.
    const response = await axios.post(
      `${config.baseURL}/change_password`,
      {
        current_password: currentPassword,
        new_password: newPassword
      },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw new Error(error.response?.data?.message || 'Failed to change password');
  }
};

/**
 * Process raw user data into meaningful statistics
 * @param {Object} userData - User info
 * @param {Object} videosData - Video and playlist data
 * @returns {Object} Processed user statistics
 */
function processUserStats(userData, videosData) {
  // Extract playlists
  const playlists = videosData.playlists || [];
  
  // Calculate total videos (unique)
  const allVideoIds = new Set();
  let totalWatchTimeSeconds = 0;
  const recentVideos = [];
  
  // Process playlists
  playlists.forEach(playlist => {
    playlist.playlist_items.forEach(video => {
      // Add to unique video IDs
      allVideoIds.add(video.video_id);
      
      // Calculate watch time
      if (video.watch_item && video.watch_item.current_time) {
        totalWatchTimeSeconds += video.watch_item.current_time;
      }
      
      // Add to recent videos if it has watch history
      if (video.watch_item) {
        recentVideos.push({
          ...video,
          playlist_name: playlist.playlist_name,
          playlist_id: playlist.playlist_id
        });
      }
    });
  });
  
  // Sort recent videos by last updated timestamp
  recentVideos.sort((a, b) => {
    const dateA = new Date(a.watch_item.last_updated);
    const dateB = new Date(b.watch_item.last_updated);
    return dateB - dateA; // Most recent first
  });
  
  // Take only the 5 most recent videos
  const recentVideosLimited = recentVideos.slice(0, 5);
  
  // Sort playlists by most watched
  const playlistWatchCount = {};
  playlists.forEach(playlist => {
    playlistWatchCount[playlist.playlist_id] = 0;
    playlist.playlist_items.forEach(video => {
      if (video.watch_item) {
        playlistWatchCount[playlist.playlist_id]++;
      }
    });
  });
  
  // Sort playlists by watch count and take top 3
  const sortedPlaylists = [...playlists].sort((a, b) => {
    return playlistWatchCount[b.playlist_id] - playlistWatchCount[a.playlist_id];
  }).slice(0, 3);
  
  return {
    totalVideos: allVideoIds.size,
    playlistsCount: playlists.length,
    watchTimeHours: Math.round(totalWatchTimeSeconds / 3600 * 10) / 10, // Round to 1 decimal
    quizzesCompleted: 0, // This would need to come from a different endpoint
    recentVideos: recentVideosLimited,
    recentPlaylists: sortedPlaylists
  };
}

export default {
  fetchUserStats,
  changePassword
};
