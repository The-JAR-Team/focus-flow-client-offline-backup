import React, { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { Bar } from 'react-chartjs-2';
import '../styles/VideoPlayer.css';
import '../styles/TriviaVideoPage.css'; // Add this import for button styles

import {fetchLastWatchTime,resetTracking ,  updateLatestLandmark ,handleVideoPause, handleVideoResume, setModelResultCallback } from '../services/videos';


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

  const [initialPlaybackTime, setInitialPlaybackTime] = useState(0);

  const [sendIntervalSeconds, setSendIntervalSeconds] = useState(10);


  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState('Playing');
  const [userPaused, setUserPaused] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);


  useEffect(() => {
    // FORRRRRRRRRRR !! unmount!!!
    return () => {
      resetTracking();
    };
  }, []);


  useEffect(() => {
    let mounted = true;
    fetchLastWatchTime(lectureInfo.videoId).then((time) => {
      if (mounted) {
        setInitialPlaybackTime(time);
        console.log('⏩ Last watched time fetched:', time);
      }
    });
  
    // Cleanup
    return () => { mounted = false; };
  }, [lectureInfo.videoId]);

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

  // Add this state near other state declarations
const [noClientPause, setNoClientPause] = useState(false);

// Add this handler function
const handleNoClientPauseToggle = () => {
  setNoClientPause(prev => !prev);
  window.noStop = !noClientPause; // Update the global flag
  console.log(`🎮 No Client Pause ${!noClientPause ? 'Enabled' : 'Disabled'}`);
};
  
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

  // Add this effect to monitor interval changes
  useEffect(() => {
    if (isPlaying) {
      handleVideoResume(
        lectureInfo.videoId, 
        'basic', 
        sendIntervalSeconds,
        () => playerRef.current?.getCurrentTime() || 0
      );
    }
  }, [sendIntervalSeconds, lectureInfo.videoId]);

  // FaceMesh results callback.

  
  const handleFaceMeshResults = useCallback((results) => {
    if (!noClientPause && mode === 'question' && questionActiveRef.current) return;
    
    // Always update landmarks for server processing
    updateLatestLandmark(results);
    
    // Only process gaze for client-side pausing
    if (!noClientPause) {
      let gaze = 'Face not detected';
      if (results.multiFaceLandmarks?.length > 0) {
        gaze = estimateGaze(results.multiFaceLandmarks[0]);
        setFaceMeshStatus('Working');
      }
      handleVideoPlayback(gaze);
    }
  }, [mode, noClientPause]);
  

  // Add this near other state declarations
  const [faceMeshReady, setFaceMeshReady] = useState(false);

  // Update the FaceMesh status handler
  const handleFaceMeshStatus = useCallback((status) => {
    setFaceMeshStatus(status);
    if (status === 'FaceMesh Ready') {
      setFaceMeshReady(true);
    }
  }, []);

  // Use the shared FaceMesh hook with the new status handler
  useFaceMesh(loaded, webcamRef, handleFaceMeshResults, handleFaceMeshStatus);

  // Add effect to start tracking when both player and FaceMesh are ready
  useEffect(() => {
    if (playerRef.current && faceMeshReady && !isVideoPaused) {
      handleVideoResume(
        lectureInfo.videoId,
        'basic',
        sendIntervalSeconds,
        () => playerRef.current?.getCurrentTime() || 0
      );
    }
  }, [faceMeshReady, lectureInfo.videoId, sendIntervalSeconds]);

  // Unified gaze handler.
  const handleVideoPlayback = (newGaze) => {
    const now = Date.now();
    if (noClientPause) {
      return;
    }
  
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
  
    if (initialPlaybackTime > 0) {
      console.log(`🔄 Seeking video to ${initialPlaybackTime}s.`);
      playerRef.current.seekTo(initialPlaybackTime, true);
    }
  
    playerRef.current.playVideo();
    // Initialize tracking as soon as the player is ready
    handleVideoResume(
      lectureInfo.videoId, 
      'v1', 
      sendIntervalSeconds,
      () => playerRef.current?.getCurrentTime() || 0
    );
    if (onVideoPlayerReady) onVideoPlayerReady();
  };
  
  const onPlayerStateChange = (event) => {
    const playerState = event.data;
  
    switch (playerState) {
      case 1: // Playing
        setIsPlaying(true);
        setPauseStatus('Playing');
        setUserPaused(false);
        setIsVideoPaused(false);
        handleVideoResume(
          lectureInfo.videoId, 
          'basic', 
          sendIntervalSeconds,
          () => playerRef.current?.getCurrentTime() || 0
        );
        break;
      case 2: // Paused
        if (systemPauseRef.current) {
          setPauseStatus('Paused (Not Engaged)');
        } else {
          setPauseStatus('Paused Manually');
          setUserPaused(true);
        }
        setIsPlaying(false);
        setIsVideoPaused(true);
        handleVideoPause();
        break;
      default:
        break;
    }
  };
  
  // Update the interval change handler
  const handleIntervalChange = (newValue) => {
    setSendIntervalSeconds(Number(newValue));
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    questionsRef.current = language === 'Hebrew' ? hebrewQuestions : englishQuestions;
    setQuestions(language === 'Hebrew' ? hebrewQuestions : englishQuestions);
  };

  const MODEL_THRESHOLD = -1.0; // Threshold for model results
  const [lastModelResult, setLastModelResult] = useState(null);

  // Setup model result handling
  useEffect(() => {
    setModelResultCallback((result) => {
      setLastModelResult(result);
      if (noClientPause && result < MODEL_THRESHOLD) {
        handleLowEngagement();
      }
    });

    return () => setModelResultCallback(null);
  }, [noClientPause]);

  const handleLowEngagement = useCallback(() => {
    if (!isPlaying || currentQuestion) return;
    
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
    systemPauseRef.current = true;
    
    if (mode === 'question') {
      const currentVideoTime = playerRef.current?.getCurrentTime() || 0;
      const availableQuestions = getAvailableQuestions(
        currentVideoTime,
        questionsRef.current,
        answeredQIDs
      );
      
      if (availableQuestions.length > 0) {
        const nextQuestion = selectNextQuestion(availableQuestions);
        if (nextQuestion) {
          setCurrentQuestion({
            q_id: nextQuestion.q_id,
            text: nextQuestion.question,
            answers: shuffleAnswers(nextQuestion),
            originalTime: parseTimeToSeconds(nextQuestion.question_origin),
            endTime: parseTimeToSeconds(nextQuestion.question_explanation_end)
          });
        }
      }
    }
  }, [mode, isPlaying, currentQuestion]);

  const renderStatus = () => (
    <div className="status-info">
      <p>Mode: {mode}</p>
      <p>Status: {pauseStatus}</p>
      <p>FaceMesh: {noClientPause ? 'Server Logic' : faceMeshStatus}</p>
      {noClientPause && <p>Model Result: {lastModelResult?.toFixed(2) || 'N/A'}</p>}
      <button 
        className={`control-button ${noClientPause ? 'active' : ''}`}
        onClick={handleNoClientPauseToggle}
      >
        {noClientPause ? '🤖 Server Control' : '👁️ Client Control'}
      </button>
      <div style={{ margin: '15px 0' }}>
        <label>Send Interval: {sendIntervalSeconds}s</label>
        <input
          type="range"
          min="0.5"
          max="10"
          value={sendIntervalSeconds}
          onChange={(e) => handleIntervalChange(e.target.value)}
        />
      </div>
    </div>
  );

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
      {renderStatus()}
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