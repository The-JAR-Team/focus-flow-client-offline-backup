import { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function useFaceMesh(enabled, videoRef, onResults, onStatusChange) {
  const errorCount = useRef(0);
  const streamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const MAX_ERRORS = 10;

  useEffect(() => {
    if (!enabled) return;
    
    let isInitialized = false;
    
    const initializeWebcam = async () => {
      try {
        // Request webcam access first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: 640,
            height: 480
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait for video to be ready
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

    const initializeFaceMesh = async () => {
      errorCount.current = 0;
      
      // Initialize webcam first
      const webcamReady = await initializeWebcam();
      if (!webcamReady) return;

      // Create new FaceMesh instance
      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMeshRef.current = faceMesh;

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        if (!isInitialized) {
          isInitialized = true;
          onStatusChange('FaceMesh Ready');
        }
        onResults(results);
        errorCount.current = 0;
      });

      await faceMesh.initialize();

      // Create camera after FaceMesh is initialized
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!videoRef.current?.srcObject || !faceMeshRef.current) return;
          try {
            await faceMeshRef.current.send({ image: videoRef.current });
          } catch (error) {
            console.error('FaceMesh send error:', error);
            errorCount.current++;
            if (errorCount.current > MAX_ERRORS) {
              onStatusChange('Too many errors - Click Retry');
            }
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;
      camera.start();
    };

    // Start initialization
    initializeFaceMesh().catch(err => {
      console.error("FaceMesh initialization failed:", err);
      onStatusChange('Initialization Failed - Click Retry');
    });

    // Cleanup function
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      isInitialized = false;
    };
  }, [enabled, videoRef, onResults, onStatusChange]);
}
