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
import { useFaceMesh } from '../components/FaceMeshContext';
import { estimateGaze } from '../services/videoLogic';
import { QuestionModal, DecisionModal } from './QuestionModals';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// Global flags
window.noStop = true;
window.noPopUp = true;

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

  const handleVideoPlayback = (gaze, deltaTime) => {
    if (gaze !== 'Looking center') {
      systemPauseRef.current = true;
      if (playerRef.current && !window.noStop) {
        playerRef.current.pauseVideo();
      }
      setIsPlaying(false);
      setPauseStatus("Paused (Not Engagement)");
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
            origin: window.location.origin,
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
