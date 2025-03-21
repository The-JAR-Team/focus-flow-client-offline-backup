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
import { estimateGaze } from '../services/videoLogic';
import { fetchTranscriptQuestions } from '../services/videos';
import { parseTimeToSeconds, shuffleAnswers } from '../services/questionLogic';
import { QuestionModal, DecisionModal } from './QuestionModals';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

window.noStop = false;

function VideoPlayer({ lectureInfo, mode }) {
  const webcamRef = useRef(null);
  const playerRef = useRef(null);
  const systemPauseRef = useRef(false);
  const lastGazeTime = useRef(Date.now());
  // New ref to hold the time when a question was last answered.
  const lastQuestionAnsweredTime = useRef(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState('Playing');
  const [userPaused, setUserPaused] = useState(false);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loaded, setLoaded] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [answeredQIDs, setAnsweredQIDs] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [decisionPending, setDecisionPending] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  // Use a ref to always hold the current question (if any)
  const questionActiveRef = useRef(null);
  useEffect(() => {
    questionActiveRef.current = currentQuestion;
  }, [currentQuestion]);

  const immediateGaze = useRef('Looking center');
  const immediateGazeChangeTime = useRef(Date.now());
  const stableGaze = useRef('Looking center');
  const stableGazeChangeTime = useRef(Date.now());

  const SMOOTHING_MS = 300;
  const CENTER_THRESHOLD_MS = 100;
  const AWAY_THRESHOLD_MS = 400;

  // Mark loaded and, if in question mode, fetch questions.
  useEffect(() => {
    setTimeout(() => setLoaded(true), 1000);
    if (mode === 'question') {
      fetchTranscriptQuestions(lectureInfo.videoId)
        .then(data => setQuestions(data.questions))
        .catch(console.error);
    }
  }, [lectureInfo.videoId, mode]);

  // Create FaceMesh instance once (or only when loaded/mode changes).
  useEffect(() => {
    if (!loaded) return;

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
      try {
        // If a question is active, freeze further gaze changes.
        if (mode === 'question' && questionActiveRef.current) {
          return;
        }

        lastGazeTime.current = Date.now();

        let gaze = 'Face not detected';
        if (results.multiFaceLandmarks?.length > 0) {
          gaze = estimateGaze(results.multiFaceLandmarks[0]);
        }

        handleVideoPlayback(gaze);
      } catch (error) {
        console.error("Error in FaceMesh onResults callback:", error);
      }
    });

    const camera = new Camera(webcamRef.current, {
      onFrame: async () => {
        try {
          await faceMesh.send({ image: webcamRef.current });
        } catch (err) {
          console.error('FaceMesh send error:', err);
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
  }, [loaded, mode]);

  // Unified gaze handler
  const handleVideoPlayback = (newGaze) => {
    const now = Date.now();

    if (newGaze !== immediateGaze.current) {
      immediateGaze.current = newGaze;
      immediateGazeChangeTime.current = now;
    }

    const timeSinceImmediateChange = now - immediateGazeChangeTime.current;
    if (timeSinceImmediateChange >= SMOOTHING_MS) {
      if (stableGaze.current !== immediateGaze.current) {
        stableGaze.current = immediateGaze.current;
        stableGazeChangeTime.current = now;
      }
    }

    const stableDuration = now - stableGazeChangeTime.current;

    // When gaze is centered, resume video (only if no question is active)
    if (stableGaze.current === 'Looking center') {
      if (mode === 'question' && questionActiveRef.current) {
        // Freeze the state until an answer is provided.
        return;
      }
      const ytState = playerRef.current?.getPlayerState?.();
      const isActuallyPaused = ytState !== 1;
      const shouldResume =
        isActuallyPaused && !userPaused && stableDuration >= CENTER_THRESHOLD_MS;

      if (shouldResume && playerRef.current && !window.noStop) {
        playerRef.current.playVideo();
        setTimeout(() => {
          if (playerRef.current.getPlayerState() === 1) {
            setIsPlaying(true);
            setPauseStatus('Playing');
            setUserPaused(false);
          }
        }, 200);
      }
    } else {
      // When not looking center, pause video and, in question mode, trigger question.
      if (isPlaying && stableDuration >= AWAY_THRESHOLD_MS) {
        if (playerRef.current && !window.noStop) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
        systemPauseRef.current = true;
        console.log('Video paused due to non-engagement. Gaze:', stableGaze.current);

        if (mode === 'question' && !questionActiveRef.current) {
          // Only trigger a new question if more than 3 seconds have passed since the last answer.
          if (now - lastQuestionAnsweredTime.current < 3000) {
            return;
          }
          const currentVideoTime = playerRef.current.getCurrentTime();
          const availableQuestions = questions.filter(q => {
            const qSec = parseTimeToSeconds(q.time_start_I_can_ask_about_it);
            return qSec <= currentVideoTime && !answeredQIDs.includes(q.q_id);
          });
          if (availableQuestions.length > 0) {
            const lastQuestion = availableQuestions.reduce((prev, curr) =>
              parseTimeToSeconds(curr.time_start_I_can_ask_about_it) >
              parseTimeToSeconds(prev.time_start_I_can_ask_about_it)
                ? curr
                : prev
            );
            console.log('Triggering question:', lastQuestion);
            setCurrentQuestion({
              q_id: lastQuestion.q_id,
              text: lastQuestion.question,
              answers: shuffleAnswers(lastQuestion),
              originalTime: parseTimeToSeconds(lastQuestion.time_start_I_can_ask_about_it)
            });
          }
        }
      }
    }
  };

  const handleAnswer = (selectedKey) => {
    const correctKey = 'answer1';
    const isCorrect = selectedKey === correctKey;
    setStats((prev) => ({
      ...prev,
      [isCorrect ? 'correct' : 'wrong']: prev[isCorrect ? 'correct' : 'wrong'] + 1
    }));
    setDecisionPending(isCorrect);
  };

  const handleDecision = (action) => {
    if (action === 'rewind') {
      playerRef.current.seekTo(currentQuestion.originalTime - 5);
    }
    setAnsweredQIDs(prev => [...prev, currentQuestion.q_id]);
    setCurrentQuestion(null);
    setDecisionPending(null);
    // Set the timestamp for the grace period.
    lastQuestionAnsweredTime.current = Date.now();
    playerRef.current.playVideo();
    setIsPlaying(true);
    setPauseStatus('Playing');
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    playerRef.current.playVideo();
  };

  const onPlayerStateChange = (event) => {
    const playerState = event.data;
    switch (playerState) {
      case 1:
        setIsPlaying(true);
        setPauseStatus('Playing');
        setUserPaused(false);
        break;
      case 2:
        if (systemPauseRef.current) {
          systemPauseRef.current = false;
          setIsPlaying(false);
          setPauseStatus('Paused (Not Engaged)');
        } else {
          setIsPlaying(false);
          setPauseStatus('Paused Manually');
          setUserPaused(true);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="video-player">
      <YouTube
        videoId={lectureInfo.videoId}
        opts={{
          height: '390',
          width: '640',
          playerVars: { autoplay: 1, controls: 1, origin: window.location.origin },
        }}
        onReady={onPlayerReady}
        onStateChange={onPlayerStateChange}
      />
      <div className="status-info">
        <p>Mode: {mode}</p>
        <p>Status: {pauseStatus}</p>
      </div>
      {mode === 'analytics' && (
        <div className="focus-graph">
          <Bar
            data={chartData}
            options={{
              scales: {
                x: { title: { display: true, text: 'Time (s)' } },
                y: { title: { display: true, text: 'Focus' }, min: 0, max: 1 },
              },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      )}
      <video ref={webcamRef} style={{ display: 'none' }} />
      {currentQuestion && (
        <QuestionModal question={currentQuestion} onAnswer={handleAnswer} />
      )}
      {decisionPending !== null && (
        <DecisionModal isCorrect={decisionPending} onDecision={handleDecision} />
      )}
    </div>
  );
}

export default VideoPlayer;
