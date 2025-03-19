import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

const FaceMeshContext = createContext();

export const FaceMeshProvider = ({ children }) => {
  const videoRef = useRef(null);
  const [results, setResults] = useState(null);
  const faceMeshRef = useRef(null);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(setResults);
    faceMeshRef.current = faceMesh;

    const video = document.createElement('video');
    videoRef.current = video;

    const camera = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: 640,
      height: 480,
    });

    faceMesh.initialize().then(() => camera.start());

    return () => {
      camera.stop();
      faceMesh.close();
    };
  }, []);

  return (
    <FaceMeshContext.Provider value={{ results }}>
      {children}
    </FaceMeshContext.Provider>
  );
};

export const useFaceMesh = () => useContext(FaceMeshContext);
