import axios from "axios";
import { config } from '../config/config';

const VIDEO_METADATA_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/fetch/video_metadata.json';
const VIDEO_TRANSCRIPT_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts'; // this is transcript question!  (AS BASED folder)


//// GITHUB fetching data from database
export const fetchVideoMetadata = async () => {
  const response = await axios.get(`${config.baseURL}/videos/accessible`, { withCredentials: true });
  if (response.status !== 200) throw new Error("Failed to fetch video metadata");
  return response.data;
};

export const fetchTranscriptQuestions = async (externalId, lang = 'Hebrew') => {
    try {
        const response = await axios.get(`${config.baseURL}/videos/${externalId}/questions?lang=${lang}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        return { video_questions: { questions: [] } };
    }
};

//// GITHUB fetching data from database
