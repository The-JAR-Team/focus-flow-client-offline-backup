import { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function useFaceMesh(enabled, videoRef, onResults, onStatusChange) {
  const errorCount = useRef(0);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const initializedRef = useRef(false);
  const MAX_ERRORS = 10;

  useEffect(() => {
    if (!enabled) return;

    let isInitialized = false;
    const MAX_INIT_RETRIES = 3;
    const INIT_RETRY_DELAY_MS = 1000;
    const retryInitialization = async (fn) => {
      let lastError;
      for (let i = 1; i <= MAX_INIT_RETRIES; i++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err;
          onStatusChange(`Initializing FaceMesh… retry ${i}/${MAX_INIT_RETRIES}`);
          console.warn(`FaceMesh init error (attempt ${i}):`, err);
          await new Promise(r => setTimeout(r, INIT_RETRY_DELAY_MS));
        }
      }
      throw lastError;
    };

    const initializeWebcam = async () => {
      try {
        // Close any existing stream
        if (streamRef.current) {
          try { streamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: 640,
            height: 480
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
              resolve();
            };
          });
          
          return true;
        }
        return false;
      } catch (err) {
        console.error("Webcam initialization error:", err);
        onStatusChange('Camera access denied');
        return false;
      }
    };

    const retryWithDelay = async (fn, maxRetries = 3, delay = 1000) => {
      let retries = 0;
      
      const attempt = async () => {
        try {
          return await fn();
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            throw error;
          }
          console.warn(`Retrying after error (${retries}/${maxRetries}):`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attempt();
        }
      };
      
      return attempt();
    };

    const initializeFaceMesh = async () => {
      errorCount.current = 0;
      const webcamReady = await initializeWebcam();
      if (!webcamReady) return false;

      // retryable factory for FaceMesh instance + initialize
      const createAndInitFaceMesh = async () => {
        // cleanup existing
        if (faceMeshRef.current) {
          try { faceMeshRef.current.close() } catch(e){}
          faceMeshRef.current = null;
        }
        // ensure Emscripten args
        if (typeof window !== 'undefined') {
          window.Module = window.Module||{};
          window.Module.arguments_ = window.Module.arguments_||[];
          // omit setting 'Module.arguments' directly to avoid TypeError
        }
        // create new
        const fm = new FaceMesh({
          locateFile: f => 
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
        });
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        fm.onResults(results => {
          if (!isInitialized) {
            isInitialized = true;
            initializedRef.current = true;
            onStatusChange('FaceMesh Ready');
          }
          onResults(results);
          errorCount.current = 0;
        });
        await fm.initialize();
        return fm;
      };

      // attempt full init up to 3 times
      try {
        faceMeshRef.current = await retryWithDelay(createAndInitFaceMesh, 3, 2000);
      } catch(err) {
        console.error('FaceMesh initialization failed after retries:', err);
        onStatusChange('Initialization Error - Click Retry');
        return false;
      }

      // Ensure we have a valid reference before creating camera
      if (!faceMeshRef.current) {
        onStatusChange('FaceMesh Instance Error - Click Retry');
        return false;
      }

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!videoRef.current?.srcObject || videoRef.current.paused || !faceMeshRef.current) return;
          
          try {
            await faceMeshRef.current.send({ image: videoRef.current });
          } catch (error) {
            errorCount.current++;
            console.error('FaceMesh send error:', error);
            
            if (errorCount.current > MAX_ERRORS) {
              onStatusChange('Too many errors - Click Retry');
              // Pause camera operation when there are too many errors
              if (cameraRef.current) {
                try { cameraRef.current.stop(); } catch (e) {}
              }
              initializedRef.current = false;
            } else {
              try {
                // For non-critical errors, try once more without recursive retry
                await retryWithDelay(() => 
                  faceMeshRef.current?.send({ image: videoRef.current }), 
                  1, // Only retry once per error
                  500  // Shorter delay
                );
              } catch (retryError) {
                // Silently handle retry failure, the error counter will handle it
              }
            }
          }
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      
      try {
        camera.start();
        return true;
      } catch (error) {
        console.error('Camera start error:', error);
        onStatusChange('Camera Start Error - Click Retry');
        return false;
      }
    };

    retryInitialization(initializeFaceMesh)
      .catch(err => {
        console.error("FaceMesh init failed after retries:", err);
        initializedRef.current = false;
        onStatusChange('Initialization Failed - Click Retry');
      });

    return () => {
      // Full cleanup on component unmount only
      initializedRef.current = false;
      isInitialized = false;
      
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch (e) {}
        cameraRef.current = null;
      }
      
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        try { videoRef.current.srcObject = null; } catch (e) {}
      }
      
      if (faceMeshRef.current) {
        try { faceMeshRef.current.close(); } catch (e) {}
        faceMeshRef.current = null;
      }
    };
  }, [enabled, videoRef, onResults, onStatusChange]);  // <- run only once on mount
}
