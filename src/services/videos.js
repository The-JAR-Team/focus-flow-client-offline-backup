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
export const TRACKING_FPS = 10;
export const FRAME_INTERVAL = 100;   // Collect frame every 100ms to complete 100 frames in 10 seconds
export const MAX_BUFFER_DURATION_SECONDS = 10; // always keep last 10 seconds
export const MAX_BUFFER_SIZE = TRACKING_FPS * MAX_BUFFER_DURATION_SECONDS;
export const REQUIRED_FRAMES = 100;  // We always want 100 frames

let landmarkBuffer = [];
let latestLandmark = null;
let latestLandmarkTimestamp = null;
let trackingInterval = null;
let sendingInterval = null;
let isVideoPaused = false;
let needsBufferDeletion = true; // Track if we need to delete buffer

let lastModelResult = null;
let onModelResultCallback = null;

export const setModelResultCallback = (callback) => {
  onModelResultCallback = callback;
};

export const resetTracking = () => {
  isVideoPaused = true;
  needsBufferDeletion = true;
  clearInterval(trackingInterval);
  clearInterval(sendingInterval);
  console.log('🔄 Tracking reset, buffer cleared, and intervals stopped.');
};

export const handleVideoPause = () => {
  resetTracking();
  console.log('🛑 Video paused.');
};

export const handleVideoResume = (youtube_id, model = 'basic', sendIntervalSeconds = 10, getCurrentTime = () => 0) => {
  clearInterval(trackingInterval);
  clearInterval(sendingInterval);

  isVideoPaused = false;

  console.log(`▶️ Video tracking started: sending every ${sendIntervalSeconds}s.`);

  // Send data at specified intervals
  sendingInterval = setInterval(async () => {
    if (!latestLandmark) {
      console.log('⚠️ No landmarks available to send');
      return;
    }

    const payload = {
      youtube_id: youtube_id,
      current_time: getCurrentTime(),
      extraction: "mediapipe",
      extraction_payload: {
        timestamp: latestLandmarkTimestamp,
        fps: 10,
        interval: sendIntervalSeconds,
        number_of_landmarks: 478,
        landmarks: [[latestLandmark]] // Single frame in double array
      },
      model: model,
      del_buffer: needsBufferDeletion
    };

    try {
      const response = await axios.post(`${config.baseURL}/watch/log_watch2`, payload, { withCredentials: true });
      const modelResult = response.data?.model_result;
      lastModelResult = modelResult;
      
      if (onModelResultCallback) {
        onModelResultCallback(modelResult);
      }
      
      console.log(`✅ Sent landmark frame successfully. Model result:`, modelResult);
      needsBufferDeletion = false; // Reset after successful send
    } catch (error) {
      console.error('❌ Error sending landmarks:', error);
    }
  }, sendIntervalSeconds * 1000);
};

export const updateLatestLandmark = (faceMeshResults) => {
  if (faceMeshResults?.multiFaceLandmarks?.[0]) {
    latestLandmark = faceMeshResults.multiFaceLandmarks[0];
    latestLandmarkTimestamp = Date.now();
  } else {
    console.warn('⚠️ No landmarks detected.');
  }
};


export const fetchLastWatchTime = async (youtube_id) => {
  try {
    const response = await axios.post(
      `${config.baseURL}/watch/get`,
      { youtube_id },
      { withCredentials: true }
    );
    return response.data?.watch_item?.current_time || 0;
  } catch (error) {
    console.error('❌ Error fetching last watched time:', error);
    return 0;
  }
};