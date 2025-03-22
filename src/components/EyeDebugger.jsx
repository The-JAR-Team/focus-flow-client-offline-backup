import React, { useEffect, useRef, useState } from 'react';
import useFaceMeshDebugger from '../hooks/useFaceMeshDebugger';
import '../styles/EyeDebugger.css';

function EyeDebugger({ enabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Delay loading by 1 second
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, [enabled]);

  // Use our custom hook to initialize FaceMesh on the video element.
  useFaceMeshDebugger(enabled && loaded, videoRef, canvasRef);

  if (!enabled || !loaded) return null;

  return (
    <div className="eye-debugger">
      <video ref={videoRef} autoPlay muted playsInline />
      <canvas ref={canvasRef} />
    </div>
  );
}

export default EyeDebugger;
