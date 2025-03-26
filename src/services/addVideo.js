import axios from 'axios';
const baseUrl = 'https://focus-flow-236589840712.me-west1.run.app';

// Expected video upload body:
// {
//   "video_id": "OJu7kIFXzxg",
//   "video_name": "Statistics",
//   "subject": "Statistics",
//   "playlists": ["generic"],
//   "description": "Some description...",
//   "length": "03:12:34",
//   "uploadby": "Prof. Jane AI"
// }
export async function uploadVideo(videoData) {
  try {
    const response = await axios.post(`${baseUrl}/videos/upload`, videoData, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true  // keep for internal API calls
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Expected create playlist body:
// {
//   "playlist_name": "My Favorite Songs",
//   "playlist_permission": "unlisted" // optional
// }
export async function createPlaylist(playlistData) {
  try {
    const response = await axios.post(`${baseUrl}/playlists`, playlistData, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getPlaylists() {
  try {
    const response = await axios.get(`${baseUrl}/playlists`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
