import React, { useRef, useState, useEffect } from 'react';
import useFaceMesh from '../hooks/useFaceMesh';
import axios from 'axios';
import { config } from '../config/config';
import '../styles/EngagementMonitor.css';

const EngagementMonitor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faceMeshStatus, setFaceMeshStatus] = useState('Initializing...');
  const [isActive, setIsActive] = useState(true);
  const [engagementScore, setEngagementScore] = useState(null);
  const [engagementClass, setEngagementClass] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Buffer for landmark data
  const landmarkBufferRef = useRef([]);
  
  // Constants for data collection
  const FPS = 10;
  const FRAME_INTERVAL = 100; // Collect frame every 100ms
  const REQUIRED_FRAMES = 100; // We need 100 frames (10 seconds at 10fps)
  const SEND_INTERVAL = 1000; // Send data every 1 second
  
  // References for intervals
  const trackingIntervalRef = useRef(null);
  const sendingIntervalRef = useRef(null);

  // Get a public video ID from the first accessible video
  const [publicVideoId, setPublicVideoId] = useState(null);
  
  // Fetch a public video ID that we can use for the engagement monitor
  useEffect(() => {
    const fetchPublicVideo = async () => {
      try {
        const response = await axios.get(
          `${config.baseURL}/videos/accessible`, 
          { withCredentials: true }
        );
        
        // Find the first video in any public/unlisted playlist
        if (response.data && response.data.playlists) {
          for (const playlist of response.data.playlists) {
            if (playlist.playlist_permission === 'public' || playlist.playlist_permission === 'unlisted') {
              if (playlist.playlist_items.length > 0) {
                setPublicVideoId(playlist.playlist_items[0].external_id);
                console.log("Using video ID for engagement API:", playlist.playlist_items[0].external_id);
                return;
              }
            }
          }
        }
        setErrorMessage("No public videos found for engagement monitoring");
      } catch (error) {
        console.error("Error fetching accessible videos:", error);
        setErrorMessage("Error fetching videos: " + (error.message || "Unknown error"));
      }
    };
    
    fetchPublicVideo();
  }, []);

  // Handle FaceMesh results
  const handleResults = (results) => {
    // Hide loading state when we get first results
    if (isLoading) {
      setIsLoading(false);
    }

    // Clear any error when we get valid results
    if (errorMessage) {
      setErrorMessage(null);
    }
    
    if (!canvasRef.current || !results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get video dimensions
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;

    // Update canvas dimensions to match video
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw video frame on canvas
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("Error drawing video to canvas:", e);
      return;
    }

    // Get bounding box from face landmarks
    const landmarks = results.multiFaceLandmarks[0];
    
    // Store the landmark data
    if (isActive && landmarks) {
      landmarkBufferRef.current.push({
        timestamp: Date.now(),
        landmarks: landmarks
      });
      
      // Keep only the most recent frames needed
      if (landmarkBufferRef.current.length > REQUIRED_FRAMES) {
        landmarkBufferRef.current.shift();
      }
    }

    // Calculate the face bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    landmarks.forEach(landmark => {
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // Add some padding to the bounding box
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);

    // Determine color based on engagement score
    let boxColor = '#FFCC00'; // Default yellow
    let shortLabel = 'Neutral'; // Default label
    
    if (engagementScore !== null) {
      if (engagementScore > 0.88) {
        boxColor = '#00FF00'; // Extra green for very engaged (>0.88)
        shortLabel = 'very engaged';
      } else if (engagementScore > 0.65) {
        boxColor = '#66CC00'; // Green for engaged (0.65-0.88)
        shortLabel = 'engaged';
      } else if (engagementScore < 0.45) {
        boxColor = '#FF0000'; // Extra red for very disengaged (<0.45)
        shortLabel = 'very disengaged';
      } else if (engagementScore < 0.65) {
        boxColor = '#FF6600'; // Red-orange for disengaged (0.45-0.65)
        shortLabel = 'disengaged';
      }
    }

    // Draw face bounding box
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(minX, minY, maxX - minX, maxY - minY);
    ctx.stroke();

    // Display engagement score if available
    if (engagementScore !== null) {
      // Calculate width of box based on face size
      const boxWidth = maxX - minX;
      
      // Create background for engagement score
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      // Increase background height for larger font sizes
      ctx.fillRect(minX, minY - 48, boxWidth, 48);
      
      // Display label on top with larger dynamic font
      const labelFontSize = Math.max(18, Math.min(24, boxWidth / 14));
      ctx.font = `bold ${labelFontSize}px Arial`;
      ctx.fillStyle = boxColor;
      ctx.textAlign = "center";
      ctx.fillText(`${shortLabel}`, minX + (boxWidth / 2), minY - 32);
      
      // Display score underneath with even larger font
      const scoreFontSize = Math.max(20, Math.min(28, boxWidth / 18));
      ctx.font = `bold ${scoreFontSize}px Arial`;
      ctx.fillText(`${engagementScore.toFixed(2)}`, minX + (boxWidth / 2), minY - 12);
    }

    ctx.restore();
  };

  // Handle status updates from FaceMesh
  const handleFaceMeshStatus = (status) => {
    setFaceMeshStatus(status);
    
    // Check for errors in status messages
    if (status.toLowerCase().includes('error') || 
        status.toLowerCase().includes('failed') ||
        status.toLowerCase().includes('denied')) {
      setErrorMessage(status);
      setIsLoading(false);
    }
    
    // When FaceMesh is ready, clear loading state
    if (status === 'FaceMesh Ready') {
      setErrorMessage(null);
      setIsLoading(false);
    }
  };

  // Initialize data collection and sending intervals
  useEffect(() => {
    if (isActive) {
      // Start collecting frames at regular intervals
      trackingIntervalRef.current = setInterval(() => {
        // This is just to ensure the buffer doesn't grow too large
        // Actual collection happens in handleResults
      }, FRAME_INTERVAL);

      // Start sending data to server at regular intervals
      sendingIntervalRef.current = setInterval(async () => {
        if (landmarkBufferRef.current.length < REQUIRED_FRAMES) {
          console.log(`⚠️ Not enough frames yet (${landmarkBufferRef.current.length}/${REQUIRED_FRAMES})`);
          return;
        }
        
        if (!publicVideoId) {
          console.log("⚠️ No video ID available");
          return;
        }

        try {
          const relevantLandmarks = landmarkBufferRef.current
            .slice(-REQUIRED_FRAMES)
            .map(item => item.landmarks);

          const payload = {
            youtube_id: publicVideoId,
            current_time: 0, // Placeholder
            extraction: "mediapipe",
            extraction_payload: {
              fps: FPS,
              interval: 10,
              number_of_landmarks: 478,
              landmarks: [relevantLandmarks]
            },
            model: "v4"
          };

          const response = await axios.post(
            `${config.baseURL}/watch/log_watch`, 
            payload, 
            { withCredentials: true }
          );
          
          if (response.data.status === 'failed') {
            setErrorMessage(response.data.reason || "API error");
            console.error('API error:', response.data.reason);
            return;
          }
          
          const modelResult = response.data?.model_result;
          const modelClass = response.data?.model_result_class_name;
          
          setEngagementScore(modelResult);
          setEngagementClass(modelClass);
          
          console.log(`✅ Sent ${REQUIRED_FRAMES} frames successfully. Model result:`, modelResult, modelClass);
        } catch (error) {
          console.error('❌ Error sending landmarks:', error);
          setErrorMessage("Error sending data: " + (error.message || "Unknown error"));
        }
      }, SEND_INTERVAL);
    }

    return () => {
      // Clean up intervals when component unmounts or isActive changes
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
      if (sendingIntervalRef.current) {
        clearInterval(sendingIntervalRef.current);
      }
    };
  }, [isActive, publicVideoId]);

  // Toggle active state
  const toggleActive = () => {
    setIsActive(!isActive);
    if (!isActive) {
      landmarkBufferRef.current = [];
    }
  };

  // Handle retry when FaceMesh fails
  const handleRetry = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setFaceMeshStatus('Initializing...');
    
    // Clear buffers
    landmarkBufferRef.current = [];
    
    // Force a browser repaint/reflow to help with webcam issues
    if (videoRef.current) {
      videoRef.current.style.display = 'none';
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.style.display = 'block';
        }
      }, 50);
    }
  };

  return (
    <div className="engagement-monitor">
      <div className="status-bar">
        <div className="status-text">
          <span>Status: {faceMeshStatus}</span>
          <span>Engagement: {engagementScore !== null ? `${engagementScore.toFixed(2)} (${engagementClass})` : 'Measuring...'}</span>
          {errorMessage && <span className="error">{errorMessage}</span>}
        </div>
        <div className="button-group">
          <button 
            className={`toggle-button ${isActive ? 'active' : 'inactive'}`} 
            onClick={toggleActive}
          >
            {isActive ? 'Pause' : 'Resume'}
          </button>
          
          {/* Only show retry button if there's an error */}
          {errorMessage && (
            <button className="retry-button" onClick={handleRetry}>
              Retry
            </button>
          )}
        </div>
      </div>

      <div className="video-container">
        <video 
          ref={videoRef} 
          className="webcam" 
          muted 
          playsInline 
          autoPlay
          style={{ objectFit: 'contain' }} 
        />
        <canvas 
          ref={canvasRef} 
          className="overlay" 
          style={{ objectFit: 'contain' }}
        />
        
        {/* Show a loading overlay when initializing */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">{faceMeshStatus}</div>
          </div>
        )}
      </div>

      {/* FaceMesh hook - with separate status handler */}
      {useFaceMesh(true, videoRef, handleResults, handleFaceMeshStatus)}
    </div>
  );
};

export default EngagementMonitor;