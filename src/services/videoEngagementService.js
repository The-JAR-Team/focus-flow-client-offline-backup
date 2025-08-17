import { initializeOnnxModel, predictEngagement } from './engagementOnnxService';
import { ONNX_CONFIG } from '../config/config';

// Local state for ONNX processing
let onnxInitialized = false;
let onnxErrorCount = 0;
let useServerFallback = false;

// Callbacks for communication with VideoPlayer
let onModelResultCallback = null;
let onBufferUpdateCallback = null;
let onFaceMeshErrorCallback = null;

/**
 * Initialize the local ONNX processing system
 * @returns {Promise<boolean>} - Success status
 */
export const initializeVideoEngagement = async () => {
  try {
    console.log('🔧 Initializing video engagement processing with ONNX...');
    
    // Reset error state
    onnxErrorCount = 0;
    useServerFallback = false;
    
    // Initialize ONNX model
    onnxInitialized = await initializeOnnxModel();
    
    if (onnxInitialized) {
      console.log('✅ Video engagement ONNX processing ready');
      return true;
    } else {
      console.warn('⚠️ ONNX initialization failed, will use server fallback');
      useServerFallback = true;
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize video engagement processing:', error);
    useServerFallback = true;
    return false;
  }
};

/**
 * Process landmarks locally or fallback to server
 * @param {Array} landmarksData - Array of landmark frames
 * @param {string} videoId - Video ID for server fallback
 * @param {number} currentTime - Current video time
 * @returns {Promise<Object|null>} - Processing result
 */
export const processEngagementData = async (landmarksData, videoId, currentTime) => {
  // If we're using server fallback or haven't initialized ONNX
  // In offline mode, do not use server fallback; ensure ONNX is initialized
  if (!onnxInitialized) {
    const ok = await initializeVideoEngagement();
    if (!ok) {
      console.warn('ONNX not initialized and no server available');
      return null;
    }
  }

  try {
    if (ONNX_CONFIG.debug) {
      console.log(`🧠 Processing ${landmarksData.length} frames with local ONNX`);
    }

    // Process landmarks with local ONNX model
    const result = await predictEngagement(landmarksData);
    
    if (!result) {
      throw new Error('ONNX prediction returned null result');
    }

    // Reset error count on successful processing
    onnxErrorCount = 0;

    // Convert to server-compatible format
    const modelResult = {
      engagement_score: result.score,
      engagement_level: result.name,
      processing_mode: 'local_onnx'
    };

    if (ONNX_CONFIG.debug) {
      console.log('✅ Local ONNX processing successful:', modelResult);
    }

    return modelResult;

  } catch (error) {
    console.error('❌ Local ONNX processing failed:', error);
    
    // Increment error count
    onnxErrorCount++;
    
  // Do not fallback to server in offline mode
  return null;
  }
};

/**
 * Fallback to server-side processing
 * @param {Array} landmarksData - Array of landmark frames
 * @param {string} videoId - Video ID
 * @param {number} currentTime - Current video time
 * @returns {Promise<Object|null>} - Server processing result
 */
// Removed server fallback function in offline mode

/**
 * Get current processing status
 * @returns {Object} - Status information
 */
export const getProcessingStatus = () => {
  return {
    onnxInitialized,
    useServerFallback,
    onnxErrorCount,
    maxErrors: ONNX_CONFIG.maxLocalErrors
  };
};

/**
 * Reset processing state (useful for testing or recovery)
 */
export const resetProcessingState = () => {
  onnxErrorCount = 0;
  useServerFallback = false;
  console.log('🔄 Video engagement processing state reset');
};

/**
 * Force switch to server fallback mode
 */
export const forceServerFallback = () => {
  useServerFallback = true;
  console.log('🌐 Forced switch to server fallback mode');
};

/**
 * Force switch back to local ONNX mode (if initialized)
 */
export const forceLocalMode = () => {
  if (onnxInitialized) {
    useServerFallback = false;
    onnxErrorCount = 0;
    console.log('🧠 Forced switch to local ONNX mode');
  } else {
    console.warn('⚠️ Cannot switch to local mode - ONNX not initialized');
  }
};

// Callback management (matching the original videos.js interface)
export const setModelResultCallback = (callback) => {
  onModelResultCallback = callback;
};

export const setBufferUpdateCallback = (callback) => {
  onBufferUpdateCallback = callback;
};

export const setFaceMeshErrorCallback = (callback) => {
  onFaceMeshErrorCallback = callback;
};

// Re-export these functions for compatibility with existing VideoPlayer code
export { 
  setModelResultCallback as setVideoModelResultCallback,
  setBufferUpdateCallback as setVideoBufferUpdateCallback,
  setFaceMeshErrorCallback as setVideoFaceMeshErrorCallback
};
