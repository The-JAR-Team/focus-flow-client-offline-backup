import axios from "axios";
import { config } from '../config/config';
import { 
  initializeVideoEngagement, 
  processEngagementData,
  getProcessingStatus
} from './videoEngagementService';
import {
  initializeVideoSession,
  addEngagementData,
  startBatchInterval,
  stopBatchInterval,
  cleanupSession,
  handlePauseEvent,
  handleSeekEvent,
  handleBufferResetEvent,
  getSessionStatus
} from './ticketService';

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

// Track if resume is in progress to prevent multiple simultaneous calls
let resumeInProgress = false;

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

export const resetTracking = async () => {
  isVideoPaused = true;
  landmarkBuffer = [];
  latestLandmark = null; // Clear the latest landmark too to prevent reusing old data
  lastUsedLandmarks = null; // Also reset the last used landmarks
  clearInterval(trackingInterval);
  clearInterval(sendingInterval);
  trackingInterval = null;
  sendingInterval = null;
  
  // Clean up session and send final batch
  try {
    await cleanupSession();
  } catch (error) {
    console.error('❌ Error cleaning up session:', error);
  }
  
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

export const handleVideoPause = async (currentTime = 0) => {
  resetTracking();
  
  // Send pause event to ticket system
  try {
    await handlePauseEvent(currentTime);
  } catch (error) {
    console.error('❌ Error sending pause event:', error);
  }
  
  console.log('🛑 Video paused.');
};

export const handleVideoResume = async (youtube_id, model = 'v1', sendIntervalSeconds = 10, getCurrentTime = () => 0) => {
  // Prevent multiple simultaneous calls
  if (resumeInProgress) {
    console.log('⚠️ Video resume already in progress, skipping duplicate call');
    return;
  }
  
  resumeInProgress = true;
  
  try {    // Clear any existing intervals first
    clearInterval(trackingInterval);
    clearInterval(sendingInterval);
    trackingInterval = null;
    sendingInterval = null;
    console.log('🧹 Cleared existing intervals for fresh start');
    
    // Reset state
    isVideoPaused = false;
    landmarkBuffer = [];
    lastUsedLandmarks = null; // Reset last used landmarks to prevent duplication
  
  // Initialize video session with new ticket system
  try {
    const ticketId = await initializeVideoSession(youtube_id);
    if (ticketId) {
      console.log(`🎫 Video session initialized with ticket: ${ticketId}`);
      
      // Start batch interval for engagement data
      startBatchInterval(sendIntervalSeconds);
    } else {
      console.warn('⚠️ Failed to initialize video session, continuing with legacy mode');
    }
  } catch (error) {
    console.error('❌ Error initializing video session:', error);
  }
  
  // Initialize ONNX processing on first resume
  const processingStatus = getProcessingStatus();
  if (!processingStatus.onnxInitialized && !processingStatus.useServerFallback) {
    console.log('🔧 Initializing ONNX processing for video engagement...');
    await initializeVideoEngagement();
  }
  
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
    // Initialize sending interval with local ONNX processing
  console.log(`⏰ Creating sending interval: ${sendIntervalSeconds * 1000}ms (${sendIntervalSeconds}s)`);
  sendingInterval = setInterval(async () => {
    // Immediate checks to prevent unnecessary processing
    if (isVideoPaused) {
      console.log('🛑 Skipping engagement processing - video paused');
      return;
    }
    
    // Don't send data if FaceMesh is in error state
    if (hasFaceMeshError) {
      console.warn('⚠️ FaceMesh error - skipping engagement processing');
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
        console.log('⚠️ Same landmarks detected, skipping duplicate processing');
        return;
      }
      lastUsedLandmarks = landmarksJSON;      // Process engagement data locally with ONNX (or fallback to server)
      const modelResult = await processEngagementData(
        relevantLandmarks, 
        youtube_id, 
        getCurrentTime()
      );
      
      if (modelResult) {
        requestsSentCount++; // Increment counter for successful processing
        lastModelResult = modelResult;
        
        // Add engagement data to batch instead of sending immediately
        const engagementData = {
          video_time: getCurrentTime(),
          engagement_score: modelResult.engagement_score || modelResult,
          engagement_level: modelResult.engagement_level,
          processing_mode: modelResult.processing_mode || 'unknown',
          landmarks_count: relevantLandmarks.length,
          processing_timestamp: Date.now()
        };
        
        addEngagementData(engagementData);
        
        if (onModelResultCallback) {
          onModelResultCallback(modelResult);
        }
        
        console.log('current_time', getCurrentTime());
        console.log(`✅ Processed ${REQUIRED_FRAMES} frames successfully (${requestsSentCount} total). Result:`, modelResult);
        
        // Update buffer info after processing
        if (onBufferUpdateCallback) {
          onBufferUpdateCallback({
            currentFrames: landmarkBuffer.length,
            requiredFrames: REQUIRED_FRAMES,
            requestsSent: requestsSentCount,
            hasError: false
          });
        }
      } else {
        console.warn('⚠️ Engagement processing returned no result');
      }
    } catch (error) {
      console.error('❌ Error processing engagement data:', error);    }
  }, sendIntervalSeconds * 1000);
  
  } catch (error) {
    console.error('❌ Error in handleVideoResume:', error);
  } finally {
    resumeInProgress = false;
  }
};

export const updateLatestLandmark = (faceMeshResults) => {
  if (faceMeshResults?.multiFaceLandmarks?.[0]) {
    latestLandmark = faceMeshResults.multiFaceLandmarks[0];
  } else {
    console.warn('⚠️ No landmarks detected.');
  }
};

// Export functions for video engagement processing
export { 
  initializeVideoEngagement,
  processEngagementData,
  getProcessingStatus
} from './videoEngagementService';

// Export ticket service functions for video events
export {
  getSessionStatus,
  handleSeekEvent,
  handleBufferResetEvent
} from './ticketService';

/**
 * Handle video seek operation
 * @param {number} fromTime - Previous time position
 * @param {number} toTime - New time position
 */
export const handleVideoSeek = async (fromTime, toTime) => {
  try {
    await handleSeekEvent(fromTime, toTime);
    // Reset buffer after seek to ensure fresh engagement data
    await handleBufferResetEvent(toTime);
    console.log(`🎯 Video seek handled: ${fromTime}s → ${toTime}s`);
  } catch (error) {
    console.error('❌ Error handling video seek:', error);
  }
};

/**
 * Handle buffer reset (e.g., when engagement tracking needs to restart)
 * @param {number} currentTime - Current video time
 */
export const handleTrackingReset = async (currentTime) => {
  try {
    await handleBufferResetEvent(currentTime);
    
    // Clear local buffer
    landmarkBuffer = [];
    lastUsedLandmarks = null;
    
    console.log(`🔄 Tracking buffer reset at ${currentTime}s`);
  } catch (error) {
    console.error('❌ Error handling tracking reset:', error);
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