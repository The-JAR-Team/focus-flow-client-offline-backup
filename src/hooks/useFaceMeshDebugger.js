// src/hooks/useFaceMeshDebugger.js
import { useEffect } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export default function useFaceMeshDebugger(enabled, videoRef, canvasRef) {
  useEffect(() => {
    if (!enabled) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;
      if (!video) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      results.multiFaceLandmarks?.forEach((landmarks) => {
        const drawEye = (indices) => {
          ctx.beginPath();
          indices.forEach((index, i) => {
            const { x, y } = landmarks[index];
            ctx[i ? 'lineTo' : 'moveTo'](x * canvas.width, y * canvas.height);
          });
          ctx.closePath();
          ctx.strokeStyle = 'cyan';
          ctx.stroke();
        };

        // Draw left eye
        drawEye([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]);
        // Draw right eye
        drawEye([362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]);
      });
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => await faceMesh.send({ image: videoRef.current }),
      width: 640,
      height: 480,
    });
    camera.start();

    return () => {
      camera.stop();
      faceMesh.close();
    };
  }, [enabled, videoRef, canvasRef]);
}
