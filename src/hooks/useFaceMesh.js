import { useEffect } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function useFaceMesh(enabled, videoRef, onResults) {
  useEffect(() => {
    if (!enabled) return;

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
    faceMesh.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        try {
          await faceMesh.send({ image: videoRef.current });
        } catch (err) {
          console.error("FaceMesh send error:", err);
        }
      },
      width: 640,
      height: 480,
    });
    camera.start();

    return () => {
      camera.stop();
      faceMesh.close();
    };
  }, [enabled, videoRef, onResults]);
}
