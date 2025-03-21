const VIDEO_METADATA_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/fetch/video_metadata.json';
const VIDEO_TRANSCRIPT_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts'; // this is transcript question!  (AS BASED folder)


//// GITHUB fetching data from database
export const fetchVideoMetadata = async () => {
  const response = await fetch(VIDEO_METADATA_URL);
  if (!response.ok) throw new Error("Failed to fetch video metadata");
  return response.json();
};

export const fetchTranscriptQuestions = async (videoId) => {
  const TRANSCRIPT_URL = `https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts/${videoId}_transcript.JSON`;
  const response = await fetch(TRANSCRIPT_URL);
  if (!response.ok) throw new Error(`Failed to fetch transcript for video ${videoId}`);
  return response.json();
};

//// GITHUB fetching data from database
