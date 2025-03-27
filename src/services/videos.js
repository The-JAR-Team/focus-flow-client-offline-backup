import axios from "axios";

const VIDEO_METADATA_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/fetch/video_metadata.json';
const VIDEO_TRANSCRIPT_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts'; // this is transcript question!  (AS BASED folder)


//// GITHUB fetching data from database
export const fetchVideoMetadata = async () => {
  const response = await axios.get("https://focus-flow-236589840712.me-west1.run.app/videos/accessible", { withCredentials: true });
  if (response.status !== 200) throw new Error("Failed to fetch video metadata");
  return response.data;
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
