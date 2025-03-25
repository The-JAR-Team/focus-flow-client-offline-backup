import React, { useEffect, useRef, useState } from 'react';
import useFaceMeshDebugger from '../hooks/useFaceMeshDebugger';
import '../styles/EyeDebugger.css';

function EyeDebugger({ enabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("loading");

  // Delay loading by 1 second
  useEffect(() => {
    if (!enabled) return;
    setLoaded(true)
    //const timer = setTimeout(() => setLoaded(true), 1000);
    //return () => clearTimeout(timer);
  }, [enabled]);

  // Use our custom hook to initialize FaceMesh on the video element.
  useFaceMeshDebugger(enabled && loaded, videoRef, canvasRef);

  // Check canvas drawing to update status once loaded
  useEffect(() => {
    if (enabled && loaded) {
      try {
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) throw new Error("Canvas context not available");
        setStatus("active");
      } catch (err) {
        console.error(err);
        setStatus("failed");
      }
    }
  }, [enabled, loaded]);

  if (!enabled) return null;

  return (
    <div className="eye-debugger">
      {loaded && (
        <>
          <video ref={videoRef} autoPlay muted playsInline />
          <canvas ref={canvasRef} />
        </>
      )}
      <div className="status">Facemesh {status}</div>
    </div>
  );
}

export default EyeDebugger;