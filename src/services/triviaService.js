import axios from 'axios';
import { config } from '../config/config';

// Fetch questions for a specific video
export const getVideoQuestions = async (videoId) => {
  try {
    const response = await axios.get(`${config.baseURL}/videos/${videoId}/questions`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    throw new Error('Failed to fetch questions');
  }
};

// Fetch all accessible videos and playlists
export const fetchTriviaData = async () => {
  try {
    const response = await axios.get(`${config.baseURL}/videos/accessible`, { 
      withCredentials: true 
    });
    if (response.status !== 200) throw new Error("Failed to fetch video metadata");
    return response.data;
  } catch (error) {
    console.error('Error fetching trivia data:', error);
    throw error;
  }
};

// Extract playlists from the response data
export const extractPlaylists = (data) => {
  // Run diagnostics on the data
  const diagnosis = diagnosePlaylistData(data);
  console.log('Playlist data diagnosis:', diagnosis);
  
  if (!diagnosis.valid || (diagnosis.valid && diagnosis.empty)) {
    console.warn('No valid playlists found in data');
    return [];
  }
  
  // Filter out the generic playlists if needed
  const relevantPlaylists = data.playlists.filter(playlist => {
    // Ensure playlist has a name and it's not 'generic'
    return playlist && playlist.playlist_name && playlist.playlist_name !== 'generic';
  });
  
  console.log('Number of non-generic playlists:', relevantPlaylists.length);
  
  if (relevantPlaylists.length === 0) {
    console.warn('No relevant playlists found after filtering');
    return [];
  }
  
  // Transform the playlists into a more usable format
  const formattedPlaylists = relevantPlaylists.map(playlist => ({
    playlist_id: playlist.playlist_id,
    playlist_name: playlist.playlist_name,
    playlist_owner_id: playlist.playlist_owner_id,
    playlist_owner_name: playlist.playlist_owner_name,
    playlist_permission: playlist.playlist_permission,
    videos: playlist.playlist_items || []
  }));
  
  console.log('Formatted playlists:', formattedPlaylists);
  return formattedPlaylists;
};

// Helper function to diagnose playlist extraction issues
export const diagnosePlaylistData = (data) => {
  console.group('Playlist Data Diagnosis');
  
  try {
    console.log('Raw data type:', typeof data);
    
    if (!data) {
      console.error('Data is null or undefined');
      console.groupEnd();
      return { valid: false, reason: 'Data is null or undefined' };
    }
    
    console.log('Data keys:', Object.keys(data));
    
    if (!data.playlists) {
      console.error('No playlists property in data');
      console.groupEnd();
      return { valid: false, reason: 'No playlists property' };
    }
    
    console.log('Playlists type:', typeof data.playlists);
    console.log('Is playlists an array:', Array.isArray(data.playlists));
    
    if (!Array.isArray(data.playlists)) {
      console.error('Playlists is not an array');
      console.groupEnd();
      return { valid: false, reason: 'Playlists is not an array' };
    }
    
    console.log('Number of playlists:', data.playlists.length);
    
    if (data.playlists.length === 0) {
      console.warn('Playlists array is empty');
      console.groupEnd();
      return { valid: true, empty: true };
    }
    
    // Check the structure of the first playlist
    const firstPlaylist = data.playlists[0];
    console.log('First playlist keys:', Object.keys(firstPlaylist));
    
    // Check mandatory properties
    const hasId = 'playlist_id' in firstPlaylist;
    const hasName = 'playlist_name' in firstPlaylist;
    const hasItems = 'playlist_items' in firstPlaylist;
    
    console.log('Has ID:', hasId);
    console.log('Has name:', hasName);
    console.log('Has items:', hasItems);
    
    if (hasItems) {
      console.log('Items is array:', Array.isArray(firstPlaylist.playlist_items));
      console.log('Number of items:', firstPlaylist.playlist_items.length);
    }
    
    console.groupEnd();
    return { 
      valid: true, 
      complete: hasId && hasName && hasItems,
      issues: !hasId ? 'Missing ID' : !hasName ? 'Missing name' : !hasItems ? 'Missing items' : null
    };
  } catch (error) {
    console.error('Error analyzing playlist data:', error);
    console.groupEnd();
    return { valid: false, reason: error.message };
  }
};

// Fetch all available playlists
export const getPlaylists = async () => {
  try {
    // Using the same endpoint as fetchTriviaData but extracting only playlists
    const data = await fetchTriviaData();
    return extractPlaylists(data);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    throw error;
  }
};

// Filter videos based on search criteria
export const filterVideos = (videos, { searchTerm, filterOwner, filterSubject, filterPlaylist, userInfo, videoOwnership, playlists }) => {
  if (!videos.length) return [];

  let filtered = [...videos];

  // Apply text search
  if (searchTerm) {
    filtered = filtered.filter(video => 
      video?.video_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      video?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video?.upload_by?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply subject filter
  if (filterSubject !== 'all') {
    filtered = filtered.filter(video => video?.subject === filterSubject);
  }

  // Apply ownership filter
  if (filterOwner !== 'all' && videoOwnership) {
    filtered = filtered.filter(video => {
      const isOwned = videoOwnership.isOwnedVideo(video.external_id);
      return filterOwner === 'me' ? isOwned : !isOwned;
    });
  }
  // Apply playlist filter
  if (filterPlaylist && playlists && playlists.length > 0) {
    // Check if filterPlaylist is an array and not empty
    if (Array.isArray(filterPlaylist) && filterPlaylist.length > 0) {
      console.log('Filtering by multiple playlists:', filterPlaylist);
      
      // Create a set of all video IDs from the selected playlists
      const playlistVideoIds = new Set();
      
      // Process each selected playlist
      filterPlaylist.forEach(playlistName => {
        const playlist = playlists.find(p => p.playlist_name === playlistName);
        if (playlist && Array.isArray(playlist.videos) && playlist.videos.length > 0) {
          // Add all video IDs from this playlist to our set
          playlist.videos.forEach(video => {
            if (video.video_id) playlistVideoIds.add(video.video_id);
            if (video.external_id) playlistVideoIds.add(video.external_id);
          });
        }
      });
      
      console.log('Combined playlist video IDs:', Array.from(playlistVideoIds));
      
      // Filter videos that match any of the selected playlists
      if (playlistVideoIds.size > 0) {
        filtered = filtered.filter(video => 
          playlistVideoIds.has(video.video_id) || playlistVideoIds.has(video.external_id)
        );
        
        console.log('Filtered videos count after multi-playlist filter:', filtered.length);
      }
    } 
    // Handle legacy 'all' filterPlaylist value
    else if (filterPlaylist === 'all') {
      // Don't filter - include all videos
    }
    // Handle single playlist as string (for backward compatibility)
    else if (typeof filterPlaylist === 'string' && filterPlaylist !== 'all') {
      console.log('Filtering by single playlist:', filterPlaylist);
      
      const selectedPlaylist = playlists.find(playlist => playlist.playlist_name === filterPlaylist);
      console.log('Selected playlist:', selectedPlaylist);
      
      if (selectedPlaylist && Array.isArray(selectedPlaylist.videos) && selectedPlaylist.videos.length > 0) {
        // Extract video IDs from the playlist items
        const playlistVideoIds = selectedPlaylist.videos.map(video => 
          video.video_id || video.external_id
        );
        
        console.log('Playlist video IDs:', playlistVideoIds);
        
        filtered = filtered.filter(video => {
          const matchesVideoId = playlistVideoIds.includes(video.video_id);
          const matchesExternalId = playlistVideoIds.includes(video.external_id);
          return matchesVideoId || matchesExternalId;
        });
        
        console.log('Filtered videos count after playlist filter:', filtered.length);
      } else {
        console.warn('Selected playlist is invalid or empty:', selectedPlaylist);
      }
    }
  }

  return filtered;
};


