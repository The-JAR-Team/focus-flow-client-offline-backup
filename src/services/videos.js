import axios from "axios";

const VIDEO_METADATA_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/fetch/video_metadata.json';
const VIDEO_TRANSCRIPT_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts'; // this is transcript question!  (AS BASED folder)


//// GITHUB fetching data from database
export const fetchVideoMetadata = async () => {
  const response = await axios.get("https://focus-flow-236589840712.me-west1.run.app/videos/accessible", { withCredentials: true });
  if (response.status !== 200) throw new Error("Failed to fetch video metadata");
  const data = response.data;
  // Flatten playlists into a videos array and map properties to expected names.
  let videos = [];
  data.playlists.forEach(playlist => {
    playlist.playlist_items.forEach(item => {
      // Map fields to what Dashboard.jsx expects.
      item.video_id = item.external_id;
      item.video_name = item.video_name;
      item.group = item.subject; 
      item.uploadby = item.upload_by; 
      videos.push(item);
    });
  });
  return videos;
};

export const fetchTranscriptQuestions = async (videoId) => {
  const url = `https://focus-flow-236589840712.me-west1.run.app/videos/${videoId}/questions?lang=Hebrew`;
  const response = await axios.get(url, { withCredentials: true });
  if (response.status !== 200) throw new Error(`Failed to fetch transcript for video ${videoId}`);
  const data = response.data;
  // Return only the questions from video_questions.
  return data.video_questions.questions;
};

//// GITHUB fetching data from database
