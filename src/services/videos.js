import axios from "axios";
import { config } from '../config/config';

const VIDEO_METADATA_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/fetch/video_metadata.json';
const VIDEO_TRANSCRIPT_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts';

export const fetchVideoMetadata = async () => {
  const response = await axios.get(`${config.baseURL}/videos/accessible`, { withCredentials: true });
  if (response.status !== 200) throw new Error("Failed to fetch video metadata");
  return response.data;
};

export const fetchTranscriptQuestions = async (videoId, language) => {
  try {
    const response = await axios.get(`${config.baseURL}/videos/${videoId}/questions?lang=${language}`, { withCredentials: true });
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
    return [
      ...(data.video_questions?.questions || []),
      ...(data.generic_questions?.questions || []),
      ...(data.subject_questions?.questions || [])
    ];
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
};

// Tracking constants
export const TRACKING_FPS = 10; // Change this value as needed: 10, 24, etc.
export const FRAME_INTERVAL = 1000 / TRACKING_FPS;
export const BUFFER_DURATION_SECONDS = 10; // always 10 seconds of data
export const BUFFER_SIZE = TRACKING_FPS * BUFFER_DURATION_SECONDS;

// State variables
let landmarkBuffer = [];
let latestLandmark = null;
let trackingInterval = null;
let isVideoPaused = false;

export const resetTracking = () => {
  isVideoPaused = true;
  landmarkBuffer = [];
  clearInterval(trackingInterval);
  console.log('🔄 Tracking reset, buffer cleared, and interval stopped.');
};


export const handleVideoPause = () => {
  isVideoPaused = true;
  landmarkBuffer = [];
  clearInterval(trackingInterval);
  console.log('🛑 Video paused, buffer cleared, tracking interval stopped.');
};

export const handleVideoResume = (youtube_id, currentTime, model = 'basic') => {
  if (trackingInterval) clearInterval(trackingInterval);

  isVideoPaused = false;
  landmarkBuffer = [];
  console.log(`▶️ Video resumed at ${TRACKING_FPS} FPS. Buffer size: ${BUFFER_SIZE} frames.`);

  trackingInterval = setInterval(async () => {
    if (isVideoPaused || !latestLandmark) {
      console.log('⚠️ Frame skipped: paused or no landmark data.');
      return;
    }

    landmarkBuffer.push(latestLandmark);

    const logInterval = TRACKING_FPS; // log each second
    if (landmarkBuffer.length % logInterval === 0) {
      console.log('📊 Buffer Progress:', {
        framesCaptured: landmarkBuffer.length,
        bufferTarget: BUFFER_SIZE,
        percentage: `${((landmarkBuffer.length / BUFFER_SIZE) * 100).toFixed(1)}%`,
        elapsedSeconds: (landmarkBuffer.length / TRACKING_FPS).toFixed(1),
      });
    }

    if (landmarkBuffer.length === BUFFER_SIZE) {
      console.log('📤 Buffer full, preparing payload...');

      try {
        const payload = {
          youtube_id: youtube_id,          // videoId from Youtube
          current_time: currentTime,       // current playback position
          extraction: "mediapipe",         // hardcoded extraction method
          extraction_payload: {
            fps: TRACKING_FPS,             // frames per second
            interval: BUFFER_DURATION_SECONDS, // explicitly 5 sec
            number_of_landmarks: landmarkBuffer.length,
            landmarks: [landmarkBuffer]    // wrap array in an extra array as in your JSON
          },
          model: model                    // hardcoded or passed model name
        };

        const sendStartTime = Date.now();

        await axios.post(`${config.baseURL}/watch/log_watch`, payload, { withCredentials: true });

        console.log('✅ Payload sent successfully:', {
          frames: BUFFER_SIZE,
          actualSendTimeSec: ((Date.now() - sendStartTime) / 1000).toFixed(2),
          timestamp: new Date().toISOString()
        });

        landmarkBuffer = [];
      } catch (error) {
        console.error('❌ Error sending payload:', error);
        landmarkBuffer = [];
      }
    }
  }, FRAME_INTERVAL);
};

export const updateLatestLandmark = (faceMeshResults) => {
  if (faceMeshResults?.multiFaceLandmarks?.[0]) {
    latestLandmark = faceMeshResults.multiFaceLandmarks[0];
    // optional log: console.log('🔄 Latest landmark updated:', latestLandmark.length);
  } else {
    console.warn('⚠️ No landmarks detected.');
  }
};