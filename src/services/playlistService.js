import { fetchVideoMetadata } from './videos';

// Expected create playlist body:
// {
//   "playlist_name": "My Favorite Songs",
//   "playlist_permission": "unlisted" // optional
// }
export async function createPlaylist(playlistData) {
    return { status: 'failed', reason: 'Creating playlists is disabled offline' };
}

// Remove video from playlist
export async function removeVideoFromPlaylist(videoData) {
    return { status: 'failed', reason: 'Editing playlists is disabled offline' };
}

// Fetch user's playlist by ID
export async function getPlaylistById(playlistId) {
    // Read from offline metadata only
    const data = await fetchVideoMetadata();
    const playlist = (data.playlists || []).find(p => p.playlist_id === parseInt(playlistId));
    if (!playlist) throw new Error('Playlist not found offline');
    return playlist;
};

// Update Playlist Permission
export async function updatePlaylistPermission(playlistId, permission) {
    return { status: 'failed', reason: 'Cannot change permissions offline' };
}

export async function updatePlaylistName(old_name, new_name) {
    return { status: 'failed', reason: 'Cannot rename playlists offline' };
}