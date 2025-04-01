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

export const fetchTranscriptQuestions = async (videoId, language) => {
  try {
    const response = await axios.get(
    
      `${config.baseURL}/videos/${videoId}/questions?lang=${language}`, 
      {
   
        withCredentials: true
      }
    );
    console.log(`Raw ${language} API response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${language} questions:`, error);
    return { video_questions: { questions: [] } };
  }
};


export const fetchTranscriptQuestionsForVideo = async (externalId, lang = 'Hebrew') => {
    try {
        const response = await axios.get(`${config.baseURL}/videos/${externalId}/questions?lang=${lang}`);
        const data = response.data;
        
        // Combine all question types into a single array
        const allQuestions = [
            ...(data.video_questions?.questions || []),
            ...(data.generic_questions?.questions || []),
            ...(data.subject_questions?.questions || [])
        ];
        
        return allQuestions;
    } catch (error) {
        console.error('Error fetching questions:', error);
        return [];
    }
};

//// GITHUB fetching data from database
