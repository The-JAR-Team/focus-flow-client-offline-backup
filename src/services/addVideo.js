import axios from 'axios';
import { config } from '../config/config';

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
    const response = await axios.post(`${config.baseURL}/videos/upload`, videoData, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true  // keep for internal API calls
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getPlaylists() {
  try {
    const response = await axios.get(`${config.baseURL}/playlists`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export function extractVideoId(input) {
  let videoId = input;
  
  try {
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      const url = new URL(input);
      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1);
      } else {
        videoId = url.searchParams.get('v') || '';
      }
    }
    // Clean any extra parameters
    videoId = videoId.split('&')[0];
    
    // Validate if it's a valid YouTube video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    }
    return '';
  } catch (error) {
    return '';
  }
}
