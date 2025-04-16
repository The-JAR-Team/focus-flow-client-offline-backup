import axios from 'axios';
import { config } from '../config/config';
import { fetchVideoMetadata } from './videos';

// Remove video from playlist
export async function removeVideoFromPlaylist(videoData) {
    try {
        // Make API call to remove video
        const response = await axios.post(`${config.baseURL}/videos/remove_from_playlist`, videoData, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error('Failed to remove video from playlist:', error);
        throw error;
    }
}

// Fetch user's playlist by ID
export async function getPlaylistById(playlistId) {
    try{
        const data = await fetchVideoMetadata();
        const playlist = data.playlists.find(p => p.playlist_id === playlistId);
        if (!playlist) throw new Error('Playlist not found');
        return playlist;
    } catch (error) {
        console.error('Error fetching playlist:', error);
        throw error;
    }
};