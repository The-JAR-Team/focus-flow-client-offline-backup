import axios from "axios";
import { config } from '../config/config';

const VIDEO_METADATA_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/fetch/video_metadata.json';
const VIDEO_TRANSCRIPT_URL = 'https://raw.githubusercontent.com/The-JAR-Team/viewDataFromDataBase/refs/heads/main/transcripts';

export const fetchVideoMetadata = async () => {
  const response = await axios.get(`${config.baseURL}/videos/accessible`, { withCredentials: true });
  if (response.status !== 200) throw new Error("Failed to fetch video metadata");
  return response.data;
};

// Track active requests to allow cancellation
export const activeRequests = {};

export const fetchTranscriptQuestions = async (videoId, language, abortSignal) => {
  try {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const requestKey = `${videoId}_${language}_${timestamp}`;
    
    // Create a request-specific abort controller if none provided
    const controller = abortSignal?.signal ? undefined : new AbortController();
    const signal = abortSignal?.signal || controller?.signal;
    
    // Track this request for potential cancellation
    if (controller) {
      activeRequests[requestKey] = controller;
    }
    
    const response = await axios.get(
      `${config.baseURL}/videos/${videoId}/questions?lang=${language}`, 
      { 
        withCredentials: true,
        timeout: 15000, // 15 second timeout
        signal // Use the abort signal
      }
    );
    
    // Clean up tracking for completed request
    if (controller) {
      delete activeRequests[requestKey];
    }
    
    console.log(`📝 Fetched ${language} questions:`, response.data?.status || 'unknown status');
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log(`🛑 Request cancelled for ${language} questions`);
      return { status: 'cancelled' };
    }
    console.error(`❌ Error fetching ${language} questions:`, error);
    return { video_questions: { questions: [] } };
  }
};

export const fetchTranscriptQuestionsForVideo = async (externalId, lang = 'Hebrew', abortSignal) => {
  try {
    const requestKey = `transcriptFor_${externalId}_${lang}`;
    
    // Create a request-specific abort controller if none provided
    const controller = abortSignal?.signal ? undefined : new AbortController();
    const signal = abortSignal?.signal || controller?.signal;
    
    // Track this request for potential cancellation
    if (controller) {
      activeRequests[requestKey] = controller;
    }
    
    const response = await axios.get(
      `${config.baseURL}/videos/${externalId}/questions?lang=${lang}`,
      { 
        withCredentials: true,
        signal // Use the abort signal
      }
    );
    
    // Clean up tracking for completed request
    if (controller) {
      delete activeRequests[requestKey];
    }
    
    const data = response.data;
    return [
      ...(data.video_questions?.questions || []),
      ...(data.generic_questions?.questions || []),
      ...(data.subject_questions?.questions || [])
    ];
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log(`🛑 Request cancelled for transcript ${lang}`);
      return [];
    }
    console.error('Error fetching questions:', error);
    return [];
  }
};

// Function to cancel all active requests
export const cancelAllRequests = () => {
  console.log(`🧹 Cancelling all ${Object.keys(activeRequests).length} active requests`);
  Object.values(activeRequests).forEach(controller => {
    try {
      controller.abort();
    } catch (e) {
      console.error('Error aborting request:', e);
    }
  });
};

// Tracking constants
export const TRACKING_FPS = 10;
export const FRAME_INTERVAL = 100;   // Collect frame every 100ms to complete 100 frames in 10 seconds
export const MAX_BUFFER_DURATION_SECONDS = 10; // always keep last 10 seconds
export const MAX_BUFFER_SIZE = TRACKING_FPS * MAX_BUFFER_DURATION_SECONDS;
export const REQUIRED_FRAMES = 100;  // We always want 100 frames

let landmarkBuffer = [];
let latestLandmark = null;
let trackingInterval = null;
let sendingInterval = null;
let isVideoPaused = false;
let requestsSentCount = 0;  // Counter for log_watch requests sent
let hasFaceMeshError = false; // Track if FaceMesh is in error state
let lastUsedLandmarks = null; // Store last landmarks sent to prevent duplicates

let lastModelResult = null;
let onModelResultCallback = null;
let onBufferUpdateCallback = null;
let onFaceMeshErrorCallback = null; // Callback for FaceMesh error notification

export const setModelResultCallback = (callback) => {
  onModelResultCallback = callback;
};

export const setBufferUpdateCallback = (callback) => {
  onBufferUpdateCallback = callback;
};

export const setFaceMeshErrorCallback = (callback) => {
  onFaceMeshErrorCallback = callback;
};

export const getRequestsSentCount = () => {
  return requestsSentCount;
};

export const resetTracking = () => {
  isVideoPaused = true;
  landmarkBuffer = [];
  latestLandmark = null; // Clear the latest landmark too to prevent reusing old data
  lastUsedLandmarks = null; // Also reset the last used landmarks
  clearInterval(trackingInterval);
  clearInterval(sendingInterval);
  trackingInterval = null;
  sendingInterval = null;
  // Don't reset requestsSentCount here to keep the total count
  console.log('🔄 Tracking reset, buffer cleared, and intervals stopped.');
  
  // Notify about empty buffer
  if (onBufferUpdateCallback) {
    onBufferUpdateCallback({
      currentFrames: 0,
      requiredFrames: REQUIRED_FRAMES,
      requestsSent: requestsSentCount,
      hasError: hasFaceMeshError
    });
  }
};

export const handleVideoPause = () => {
  resetTracking();
  console.log('🛑 Video paused.');
};

export const handleVideoResume = async (youtube_id, model = 'v1', sendIntervalSeconds = 10, getCurrentTime = () => 0) => {
  // Clear any existing intervals first
  clearInterval(trackingInterval);
  clearInterval(sendingInterval);
    // Reset state
  isVideoPaused = false;
  landmarkBuffer = [];
  lastUsedLandmarks = null; // Reset last used landmarks to prevent duplication
  
  // Always collect frames regardless of mode
  console.log(`▶️ Video tracking started: collecting frame every ${FRAME_INTERVAL}ms, sending every ${sendIntervalSeconds}s.`);

  // Start collecting frames (in both modes)
  trackingInterval = setInterval(() => {
    if (isVideoPaused) {
      console.log('🛑 Tracking paused due to video pause');
      return;
    }
    
    // If FaceMesh is in error state, don't collect frames
    if (hasFaceMeshError) {
      // Clear buffer when in error state to avoid using corrupted data
      if (landmarkBuffer.length > 0) {
        landmarkBuffer = [];
        console.warn('⚠️ FaceMesh error detected - buffer cleared');
        
        // Notify buffer update with empty buffer
        if (onBufferUpdateCallback) {
          onBufferUpdateCallback({
            currentFrames: 0,
            requiredFrames: REQUIRED_FRAMES,
            requestsSent: requestsSentCount,
            hasError: true
          });
        }
      }
      return;
    }
    
    // Only add to buffer if we have landmarks and they're different from previous
    if (latestLandmark) {
      landmarkBuffer.push({
        timestamp: Date.now(),
        landmarks: latestLandmark
      });

      // Keep only the most recent frames needed
      if (landmarkBuffer.length > REQUIRED_FRAMES) {
        landmarkBuffer.shift();
      }
      
      // Notify buffer update (in both modes)
      if (onBufferUpdateCallback) {
        onBufferUpdateCallback({
          currentFrames: landmarkBuffer.length,
          requiredFrames: REQUIRED_FRAMES,
          requestsSent: requestsSentCount,
          hasError: false
        });
      }
    }
  }, FRAME_INTERVAL);
  // Initialize sending interval in both client and server modes
  sendingInterval = setInterval(async () => {
    // Immediate checks to prevent unnecessary processing
    if (isVideoPaused) {
      console.log('🛑 Skipping log_watch - video paused');
      return;
    }
    
    // Don't send data if FaceMesh is in error state
    if (hasFaceMeshError) {
      console.warn('⚠️ FaceMesh error - skipping log_watch request');
      return;
    }
    
    if (landmarkBuffer.length < REQUIRED_FRAMES) {
      console.log(`⚠️ Not enough frames yet (${landmarkBuffer.length}/${REQUIRED_FRAMES})`);
      return;
    }

    try {
      const relevantLandmarks = landmarkBuffer
        .slice(-REQUIRED_FRAMES)
        .map(item => item.landmarks);
      
      // Check if landmarks are the same as last request
      const landmarksJSON = JSON.stringify(relevantLandmarks);
      if (lastUsedLandmarks === landmarksJSON) {
        console.log('⚠️ Same landmarks detected, skipping duplicate request');
        return;
      }
      lastUsedLandmarks = landmarksJSON;

      const payload = {
        youtube_id: youtube_id,
        current_time: getCurrentTime(),
        extraction: "mediapipe",
        extraction_payload: {
          fps: 10,
          interval: 10,
          number_of_landmarks: 478,
          landmarks: [relevantLandmarks]
        },          
        model: "v1"
      };
      
      const response = await axios.post(`${config.baseURL}/watch/log_watch`, payload, { withCredentials: true });
      requestsSentCount++; // Increment counter for successful requests
      const modelResult = response.data?.model_result;
      lastModelResult = modelResult;
      
      if (onModelResultCallback) {
        onModelResultCallback(modelResult);
      }
      console.log('current_time', getCurrentTime());
      console.log(`✅ Sent ${REQUIRED_FRAMES} frames successfully (${requestsSentCount} total). Model result:`, modelResult);
      
      // Update buffer info after sending
      if (onBufferUpdateCallback) {
        onBufferUpdateCallback({
          currentFrames: landmarkBuffer.length,
          requiredFrames: REQUIRED_FRAMES,
          requestsSent: requestsSentCount,
          hasError: false
        });
      }
    } catch (error) {
      console.error('❌ Error sending landmarks:', error);
    }
  }, sendIntervalSeconds * 1000);
};

export const updateLatestLandmark = (faceMeshResults) => {
  if (faceMeshResults?.multiFaceLandmarks?.[0]) {
    latestLandmark = faceMeshResults.multiFaceLandmarks[0];
  } else {
    console.warn('⚠️ No landmarks detected.');
  }
};

// Handle FaceMesh error state
export const setFaceMeshErrorState = (isError) => {
  const previousState = hasFaceMeshError;
  hasFaceMeshError = isError;
  
  // If error state changes, notify callback
  if (previousState !== isError && onFaceMeshErrorCallback) {
    onFaceMeshErrorCallback(isError);
    
    // Clear buffer when entering error state
    if (isError && landmarkBuffer.length > 0) {
      landmarkBuffer = [];
      console.warn('⚠️ FaceMesh error detected - buffer cleared');
      
      // Update buffer status
      if (onBufferUpdateCallback) {
        onBufferUpdateCallback({
          currentFrames: 0,
          requiredFrames: REQUIRED_FRAMES,
          requestsSent: requestsSentCount,
          hasError: true
        });
      }
    }
  }
  
  return isError;
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

export const fetchWatchItemResults = async (youtube_id, option) => {
  try {
    if (!option) 
      option = 'alone';
    const response = await axios.get(
      `${config.baseURL}/watch/get_results?youtube_id=${youtube_id}&option=${option}`,
      { withCredentials: true }
    );
    // return response.data;
    return response.data.results_by_user;
  } catch (error) {
    console.error('❌ Error fetching results:', error);
    return 0;
  }
};