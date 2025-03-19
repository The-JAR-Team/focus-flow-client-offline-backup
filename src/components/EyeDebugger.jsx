import React, { useEffect, useRef, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import '../styles/EyeDebugger.css';

function EyeDebugger({ enabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      setLoaded(true);
    }, 1000); // 1-second delay

    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!loaded) return;

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
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
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

        drawEye([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]);
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
  }, [loaded]);

  return enabled && loaded ? (
    <div className="eye-debugger">
      <video ref={videoRef} autoPlay muted playsInline />
      <canvas ref={canvasRef} />
    </div>
  ) : null;
}

export default EyeDebugger;
