import React, { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { Bar } from 'react-chartjs-2';
import '../styles/VideoPlayer.css';
import '../styles/TriviaVideoPage.css'; // Add this import for button styles

import {  updateLatestLandmark ,handleVideoPause, handleVideoResume } from '../services/videos';


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
import { fetchTranscriptQuestionsForVideo } from '../services/videos';
import {
  parseTimeToSeconds,
  shuffleAnswers,
  getAvailableQuestions,
  selectNextQuestion,
} from '../services/questionLogic';
import { QuestionModal, DecisionModal } from './QuestionModals';
import useFaceMesh from '../hooks/useFaceMesh';

import EyeDebugger
 from './EyeDebugger';
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

window.noStop = false;

function VideoPlayer({ lectureInfo, mode, onVideoPlayerReady }) {
  const webcamRef = useRef(null);
  const playerRef = useRef(null);
  const systemPauseRef = useRef(false);
  const lastGazeTime = useRef(Date.now());
  const lastQuestionAnsweredTime = useRef(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState('Playing');
  const [userPaused, setUserPaused] = useState(false);
  // Use a ref for immediate access to the userPaused flag
  const userPausedRef = useRef(userPaused);
  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loaded, setLoaded] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [answeredQIDs, setAnsweredQIDs] = useState(() => {
    const stored = localStorage.getItem(`answeredQuestions_${lectureInfo.videoId}`);
    return stored ? JSON.parse(stored) : [];
  });
  useEffect(() => {
    localStorage.setItem(`answeredQuestions_${lectureInfo.videoId}`, JSON.stringify(answeredQIDs));
  }, [answeredQIDs, lectureInfo.videoId]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [decisionPending, setDecisionPending] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  // Maintain the latest questions in a ref
  const questionsRef = useRef(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Maintain the active question in a ref
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

  const [faceMeshStatus, setFaceMeshStatus] = useState('Initializing');
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [faceMeshEnabled, setFaceMeshEnabled] = useState(true);

  const handleFaceMeshRetry = () => {
    setShowRetryButton(false);
    setFaceMeshStatus('Initializing');
    setFaceMeshEnabled(false);
    // Give time for cleanup
    setTimeout(() => {
      setFaceMeshEnabled(true);
    }, 1000);
  };

  const [selectedLanguage, setSelectedLanguage] = useState('Hebrew');
  const [hebrewQuestions, setHebrewQuestions] = useState([]);
  const [englishQuestions, setEnglishQuestions] = useState([]);
  const [isHebrewLoading, setIsHebrewLoading] = useState(true);
  const [isEnglishLoading, setIsEnglishLoading] = useState(true);

  // Set loaded after a short delay and fetch questions if in question mode.
  useEffect(() => {
    setTimeout(() => setLoaded(true), 1000);
    if (mode === 'question') {
      console.log("[DEBUG] Starting questions fetch for:", lectureInfo.videoId);
      // Fetch Hebrew questions
      setIsHebrewLoading(true);
      fetchTranscriptQuestionsForVideo(lectureInfo.videoId, 'Hebrew')
        .then(questions => {
          if (Array.isArray(questions) && questions.length > 0) {
            const sortedQuestions = questions.sort((a, b) => {
              return (parseTimeToSeconds(a.question_origin) || 0) - (parseTimeToSeconds(b.question_origin) || 0);
            });
            setHebrewQuestions(sortedQuestions);
            if (selectedLanguage === 'Hebrew') {
              questionsRef.current = sortedQuestions;
              setQuestions(sortedQuestions);
            }
          }
        })
        .catch(error => console.error("[DEBUG] Error fetching Hebrew questions:", error))
        .finally(() => setIsHebrewLoading(false));

      // Fetch English questions
      setIsEnglishLoading(true);
      fetchTranscriptQuestionsForVideo(lectureInfo.videoId, 'English')
        .then(questions => {
          if (Array.isArray(questions) && questions.length > 0) {
            const sortedQuestions = questions.sort((a, b) => {
              return (parseTimeToSeconds(a.question_origin) || 0) - (parseTimeToSeconds(b.question_origin) || 0);
            });
            setEnglishQuestions(sortedQuestions);
            if (selectedLanguage === 'English') {
              questionsRef.current = sortedQuestions;
              setQuestions(sortedQuestions);
            }
          }
        })
        .catch(error => console.error("[DEBUG] Error fetching English questions:", error))
        .finally(() => setIsEnglishLoading(false));
    }
  }, [lectureInfo.videoId, mode, selectedLanguage]);

  // Add effect to monitor questions state
  useEffect(() => {
    if (questions.length > 0) {
      console.log("[DEBUG] Questions state updated. Length:", questions.length);
      console.log("[DEBUG] First question in state:", questions[0]);
    }
  }, [questions]);

  // FaceMesh results callback.

  
  const handleFaceMeshResults = useCallback((results) => {
    if (mode === 'question' && questionActiveRef.current) return;
    
    const currentTime = playerRef.current?.getCurrentTime() || 0;
  
    // Always update the latest landmark
    updateLatestLandmark(results);
  
    // Continue with your gaze logic
    let gaze = 'Face not detected';
    if (results.multiFaceLandmarks?.length > 0) {
      gaze = estimateGaze(results.multiFaceLandmarks[0]);
      setFaceMeshStatus('Working');
    }
    handleVideoPlayback(gaze);
  }, [mode, lectureInfo]);
  

  // Use the shared FaceMesh hook.
  useFaceMesh(loaded, webcamRef, handleFaceMeshResults, setFaceMeshStatus);

  // Unified gaze handler.
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

    // If gaze is centered, auto-resume video only if not manually paused.
    if (stableGaze.current === 'Looking center') {
      if (mode === 'question' && questionActiveRef.current) return;
      const ytState = playerRef.current?.getPlayerState?.();
      const isActuallyPaused = ytState !== 1;
      const shouldResume = isActuallyPaused && !userPausedRef.current && stableDuration >= CENTER_THRESHOLD_MS;
      if (shouldResume && playerRef.current && !window.noStop) {
        //console.log("Resuming video. Gaze is centered.");
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
      // When gaze is away, pause video and trigger question (in question mode).
      if (isPlaying && stableDuration >= AWAY_THRESHOLD_MS) {
        if (playerRef.current && !window.noStop) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
        systemPauseRef.current = true;
        //console.log('Video paused due to non-engagement. Gaze:', stableGaze.current);
        if (mode === 'question' && !questionActiveRef.current) {
          if (now - lastQuestionAnsweredTime.current < 3000) return;
          const currentVideoTime = playerRef.current.getCurrentTime();
          
          //console.log("[DEBUG] Checking for questions at time:", { currentVideoTime,    questionsInRef: questionsRef.current.length,      firstQuestionInRef: questionsRef.current[0],});
          
          const availableQuestions = getAvailableQuestions(
            currentVideoTime,
            questionsRef.current, // Use ref instead of state
            answeredQIDs
          );
          //console.log("[DEBUG] Available questions (result from getAvailableQuestions):", availableQuestions);
          if (availableQuestions.length > 0) {
            const nextQuestion = selectNextQuestion(availableQuestions);
            if (nextQuestion) {
              //console.log('[DEBUG] Triggering question:', nextQuestion);
              setCurrentQuestion({
                q_id: nextQuestion.q_id,
                text: nextQuestion.question,
                answers: shuffleAnswers(nextQuestion),
                originalTime: parseTimeToSeconds(nextQuestion.question_origin),
                endTime: parseTimeToSeconds(nextQuestion.question_explanation_end)
              });
              // Exit fullscreen if active when question is triggered.
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
              }
            }
          }
        }
      }
    }
  };

  const handleAnswer = (selectedKey) => {
    const correctKey = 'answer1';
    const isCorrect = selectedKey === correctKey;
    console.log("User selected:", selectedKey, "Correct key:", correctKey, "Is correct?", isCorrect);
    setStats(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'wrong']: prev[isCorrect ? 'correct' : 'wrong'] + 1
    }));
    setDecisionPending(isCorrect);
  };

  const handleDecision = (action) => {
    if (action === 'rewind') {
      const rewindTime = Math.max(0, currentQuestion.originalTime - 4); 
      if (typeof rewindTime === 'number' && !isNaN(rewindTime)) {
        playerRef.current.seekTo(rewindTime, true);
      }
    }
    if (decisionPending === true) {
      console.log("User answered correctly. Removing question:", currentQuestion);
      setQuestions(prev => {
        const updated = prev.filter(q => q.q_id !== currentQuestion.q_id);
        console.log("Updated questions list:", updated);
        return updated;
      });
      setAnsweredQIDs(prev => [...prev, currentQuestion.q_id]);
    } else {
      console.log("User answered incorrectly. Keeping question for future attempts:", currentQuestion);
    }
    setCurrentQuestion(null);
    setDecisionPending(null);
    lastQuestionAnsweredTime.current = Date.now();
    playerRef.current.playVideo();
    setIsPlaying(true);
    setPauseStatus('Playing');
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    console.log("Player ready, starting video");
    playerRef.current.playVideo();
    // Notify parent the video is loaded.
    if (onVideoPlayerReady) onVideoPlayerReady();
  };

  const onPlayerStateChange = (event) => {
    const playerState = event.data;
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    
    switch (playerState) {
      case 1: // Playing
        setIsPlaying(true);
        setPauseStatus('Playing');
        setUserPaused(false);
        handleVideoResume(lectureInfo.id || lectureInfo.videoId, currentTime);
        break;
      case 2: // Paused
        if (systemPauseRef.current) {
          systemPauseRef.current = false;
          setPauseStatus('Paused (Not Engaged)');
        } else {
          setPauseStatus('Paused Manually');
          setUserPaused(true);
        }
        setIsPlaying(false);
        handleVideoPause();
        break;
      default:
        break;
    }
  };
  

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    questionsRef.current = language === 'Hebrew' ? hebrewQuestions : englishQuestions;
    setQuestions(language === 'Hebrew' ? hebrewQuestions : englishQuestions);
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
        <p>FaceMesh: {faceMeshStatus}</p>
        {showRetryButton && (
          <button 
            className="retry-button"
            onClick={handleFaceMeshRetry}
          >
            Retry FaceMesh
          </button>
        )}
      </div>
      {mode === 'question' && (
        <div className="language-options" style={{ margin: '20px 0', direction: 'ltr' }}>
          <button 
            className={`lang-btn ${selectedLanguage === 'Hebrew' ? 'active' : ''} ${hebrewQuestions.length === 0 ? 'disabled' : ''}`}
            onClick={() => handleLanguageChange('Hebrew')}
            disabled={isHebrewLoading || hebrewQuestions.length === 0}
          >
            Hebrew {isHebrewLoading ? '⌛' : hebrewQuestions.length === 0 ? '❌' : '✓'}
          </button>
          <button 
            className={`lang-btn ${selectedLanguage === 'English' ? 'active' : ''} ${englishQuestions.length === 0 ? 'disabled' : ''}`}
            onClick={() => handleLanguageChange('English')}
            disabled={isEnglishLoading || englishQuestions.length === 0}
          >
            English {isEnglishLoading ? '⌛' : englishQuestions.length === 0 ? '❌' : '✓'}
          </button>
        </div>
      )}
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
      <video 
        ref={webcamRef}
        style={{ display: 'none' }}
        playsInline
        muted
        autoPlay
      />
      {currentQuestion && (
        <QuestionModal 
          question={currentQuestion} 
          onAnswer={handleAnswer} 
          language={selectedLanguage}
        />
      )}
      {decisionPending !== null && (
        <DecisionModal 
          isCorrect={decisionPending} 
          onDecision={handleDecision}
          language={selectedLanguage}
        />
      )}
            <EyeDebugger enabled={false} />

    </div>
  );
}

export default VideoPlayer;
