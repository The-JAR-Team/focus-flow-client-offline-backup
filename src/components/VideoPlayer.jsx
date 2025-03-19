import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { Bar } from 'react-chartjs-2';
import '../styles/VideoPlayer.css';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
// Import the shared FaceMesh context hook (assumes you set it up)
import { useFaceMesh } from '../components/FaceMeshContext';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// Global flags
window.noStop = true;    // When true, video is not actually paused
window.noPopUp = true;   // When true, question modal will not be shown

function QuestionModal({ question, onAnswer }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h3>Question:</h3>
        <p>{question.text}</p>
        <div className="answers">
          {question.answers.map((ans) => (
            <button key={ans.key} onClick={() => onAnswer(ans.key)}>
              {ans.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionModal({ isCorrect, onDecision }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h3>{isCorrect ? 'Correct!' : 'Incorrect.'}</h3>
        <p>What would you like to do?</p>
        <div className="decision-buttons">
          <button onClick={() => onDecision('continue')}>Continue Watching</button>
          <button onClick={() => onDecision('rewind')}>Rewind</button>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ mode, sessionPaused, sessionEnded, onSessionData, lectureInfo, userInfo }) {
  const webcamRef = useRef(null);
  const playerRef = useRef(null);
  const systemPauseRef = useRef(false);
  const lastGazeTime = useRef(Date.now());

  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState("Playing");
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);

  const dummyQuestion = {
    text: 'Are you paying attention?',
    answers: [
      { key: 'a', text: 'Yes', correct: true },
      { key: 'b', text: 'No', correct: false },
    ],
  };

  // Use shared FaceMesh from context if available; otherwise, fallback to local initialization.
  const { faceMesh: sharedFaceMesh } = useFaceMesh() || {};

  useEffect(() => {
    let faceMesh;
    if (sharedFaceMesh) {
      faceMesh = sharedFaceMesh;
    } else {
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
    }

    faceMesh.onResults((results) => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastGazeTime.current;
      lastGazeTime.current = currentTime;

      let gaze = 'Face not detected';
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        gaze = estimateGaze(results.multiFaceLandmarks[0]);
      }
      handleVideoPlayback(gaze, deltaTime);
    });

    let camera;
    if (webcamRef.current) {
      camera = new Camera(webcamRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => {
      if (camera) {
        camera.stop();
      }
      if (!sharedFaceMesh) {
        faceMesh.close();
      }
    };
  }, [sharedFaceMesh]);

  const estimateGaze = (landmarks) => {
    const leftEye = {
      outer: landmarks[33],
      inner: landmarks[133],
      center: landmarks[468],
    };
    const rightEye = {
      outer: landmarks[362],
      inner: landmarks[263],
      center: landmarks[473],
    };

    const leftGazeRatio =
      (leftEye.center.x - leftEye.outer.x) /
      (leftEye.inner.x - leftEye.outer.x);
    const rightGazeRatio =
      (rightEye.center.x - rightEye.outer.x) /
      (rightEye.inner.x - rightEye.outer.x);

    const avgGazeRatio = (leftGazeRatio + rightGazeRatio) / 2;
    if (avgGazeRatio < 0.42) {
      return 'Looking left';
    } else if (avgGazeRatio > 0.58) {
      return 'Looking right';
    } else {
      return 'Looking center';
    }
  };

  const handleVideoPlayback = (gaze, deltaTime) => {
    // When gaze is not center, update state.
    // Only call pauseVideo/seekTo if noStop is false.
    if (gaze !== 'Looking center') {
      systemPauseRef.current = true;
      if (playerRef.current && !window.noStop) {
        playerRef.current.pauseVideo();
      }
      setIsPlaying(false);
      setPauseStatus("Paused (Not Engagement)");
      // Only show question popup if mode is 'question' and noPopUp is false
      if (mode === 'question' && !showQuestionModal && !window.noPopUp) {
        setCurrentQuestion(dummyQuestion);
        setShowQuestionModal(true);
      }
    } else {
      if (playerRef.current && !sessionPaused && !window.noStop) {
        playerRef.current.playVideo();
      }
      setIsPlaying(true);
      setPauseStatus("Playing");
    }
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    if (sessionPaused) {
      event.target.pauseVideo();
      setIsPlaying(false);
      setPauseStatus("Paused (Engagement)");
    } else {
      event.target.playVideo();
      setIsPlaying(true);
      setPauseStatus("Playing");
    }
  };

  const onPlayerStateChange = (event) => {
    const playerState = event.data;
    if (playerState === 1) {
      setIsPlaying(true);
      setPauseStatus("Playing");
    } else if (playerState === 2) {
      if (systemPauseRef.current) {
        systemPauseRef.current = false;
      } else {
        setIsPlaying(false);
        setPauseStatus("Paused Manually");
      }
    }
  };

  const handleAnswer = (selectedKey) => {
    const isCorrect = currentQuestion.answers.find((ans) => ans.key === selectedKey)?.correct;
    setIsAnswerCorrect(isCorrect);
    setShowQuestionModal(false);
    setShowDecisionModal(true);
  };

  const handleDecision = (decision) => {
    setShowDecisionModal(false);
    if (decision === 'continue') {
      if (playerRef.current && !window.noStop) {
        playerRef.current.playVideo();
      }
      setIsPlaying(true);
      setPauseStatus("Playing");
    } else if (decision === 'rewind') {
      if (playerRef.current && !window.noStop) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
      setIsPlaying(true);
      setPauseStatus("Playing");
    }
  };

  const chartOptions = {
    scales: {
      x: { title: { display: true, text: 'Time (s)' } },
      y: {
        title: { display: true, text: 'Focus' },
        min: 0,
        max: 1,
        ticks: { stepSize: 1 },
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div className="video-player">
      <YouTube
        videoId={lectureInfo.videoId}
        opts={{
          height: '390',
          width: '640',
          playerVars: {
            autoplay: 1,
            controls: 1,
            origin: window.location.origin, // fixes postMessage origin errors
          },
        }}
        onReady={onPlayerReady}
        onStateChange={onPlayerStateChange}
      />
      <div className="status-info">
        <p>Video Status: {isPlaying ? "Playing" : pauseStatus}</p>
      </div>
      <div className="focus-graph">
        <Bar data={chartData} options={chartOptions} />
      </div>
      {/* Hidden webcam for engagement detection */}
      <video ref={webcamRef} style={{ display: 'none' }} />
      {showQuestionModal && currentQuestion && (
        <QuestionModal question={currentQuestion} onAnswer={handleAnswer} />
      )}
      {showDecisionModal && (
        <DecisionModal isCorrect={isAnswerCorrect} onDecision={handleDecision} />
      )}
    </div>
  );
}

export default VideoPlayer;
