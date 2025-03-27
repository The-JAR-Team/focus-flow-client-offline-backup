import { useEffect } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function useFaceMesh(enabled, videoRef, onResults, onStatusChange) {
  useEffect(() => {
    if (!enabled) return;

    let retryTimeout;
    let isProcessing = false;

    const faceMesh = new FaceMesh({
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
      isProcessing = false;
      onResults(results);
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        try {
          if (isProcessing) return;
          isProcessing = true;
          await faceMesh.send({ image: videoRef.current });
        } catch (err) {
          console.error("FaceMesh send error:", err);
          onStatusChange('Error - Retrying...');
          isProcessing = false;
          
          // Clear any existing retry timeout
          if (retryTimeout) clearTimeout(retryTimeout);
          
          // Wait 2 seconds before retrying
          retryTimeout = setTimeout(async () => {
            try {
              await faceMesh.initialize();
              onStatusChange('Restarted');
            } catch (initErr) {
              console.error("FaceMesh restart failed:", initErr);
              onStatusChange('Failed to restart');
            }
          }, 2000);
        }
      },
      width: 640,
      height: 480,
    });

    // Initialize faceMesh
    faceMesh.initialize().then(() => {
      onStatusChange('Initialized');
      camera.start();
    }).catch(err => {
      console.error("FaceMesh initialization error:", err);
      onStatusChange('Initialization Failed');
    });

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      camera.stop();
      faceMesh.close();
    };
  }, [enabled, videoRef, onResults, onStatusChange]);
}
