import { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function useFaceMesh(enabled, videoRef, onResults, onStatusChange) {
  const errorCount = useRef(0);
  const streamRef = useRef(null);
  const MAX_ERRORS = 10;

  useEffect(() => {
    if (!enabled) return;
    
    let camera = null;
    let faceMesh = null;
    
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

      faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        onResults(results);
        errorCount.current = 0;
      });

      await faceMesh.initialize();
      onStatusChange('FaceMesh Ready');

      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!videoRef.current?.srcObject) {
            throw new Error('Video source not ready');
          }
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start();
    };

    // Start initialization
    initializeFaceMesh().catch(err => {
      console.error("FaceMesh initialization failed:", err);
      onStatusChange('Initialization Failed - Click Retry');
    });

    // Cleanup function
    return () => {
      if (camera) {
        camera.stop();
      }
      if (faceMesh) {
        faceMesh.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled, videoRef, onResults, onStatusChange]);
}
