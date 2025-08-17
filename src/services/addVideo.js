// Offline: uploads and playlist API are disabled; provide local stubs

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
  // Not supported offline
  return { status: 'failed', reason: 'Video upload disabled in offline mode' };
}

export async function getPlaylists() {
  // Build a simple list of playlist names from offline accessible data
  try {
  const res = await fetch(`${import.meta.env.BASE_URL}offline/accessible..json`, { cache: 'no-store' });
    if (!res.ok) return { status: 'failed' };
    const data = await res.json();
    const playlists = (data.playlists || []).map(p => ({
      playlist_id: p.playlist_id,
      playlist_name: p.playlist_name
    }));
    return { status: 'success', playlists };
  } catch {
    return { status: 'failed' };
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
