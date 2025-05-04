import React, { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { Bar } from 'react-chartjs-2';
import '../styles/VideoPlayer.css';
import '../styles/TriviaVideoPage.css'; // Add this import for button styles
import '../styles/QuestionTimeline.css'; // Import the CSS for QuestionTimeline

import {
  fetchLastWatchTime,
  resetTracking,
  updateLatestLandmark,
  handleVideoPause,
  handleVideoResume,
  setModelResultCallback,
  cancelAllRequests,
} from '../services/videos';
import {
  setEngagementDetectionEnabled,
  getEngagementDetectionEnabled,
  setVideoPlaying,
  startManualTrigger,
  handleEngagementDetection,
  estimateGaze,
  canAskQuestion,
  markQuestionAsked,
  setGazeSensitivity
} from '../services/videoLogic';
import {
  fetchQuestionsWithRetry,
  handleResetAnsweredQuestions as serviceResetAnsweredQuestions,
  handlePlotResults as servicePlotResults,
  handleLanguageChange as serviceHandleLanguageChange,
  parseTimeToSeconds,
  shuffleAnswers,
  getAvailableQuestions,
  selectNextQuestion
} from '../services/videoPlayerService';
import {
  formatTime
} from '../services/questionTimelineService';

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { QuestionModal, DecisionModal } from './QuestionModals';
import useFaceMesh from '../hooks/useFaceMesh';
import QuestionTimeline from './QuestionTimeline'; // Import the new component

import EyeDebugger from './EyeDebugger';
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

window.noStop = false;

function VideoPlayer({ lectureInfo, mode, onVideoPlayerReady }) {
  const webcamRef = useRef(null);
  const playerRef = useRef(null);
  const systemPauseRef = useRef(false);
  const lastGazeTime = useRef(Date.now());
  const lastQuestionAnsweredTime = useRef(0);

  const [disableEngagementLogic, setDisableEngagementLogic] = useState(false);
  const [debugTriggerActive, setDebugTriggerActive] = useState(false);

  const [initialPlaybackTime, setInitialPlaybackTime] = useState(0);
  const [sendIntervalSeconds, setSendIntervalSeconds] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState('Playing');
  const [userPaused, setUserPaused] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [resultsChartData, setResultsChartData] = useState({ labels: [], datasets: [] });
  const [showResultsChart, setShowResultsChart] = useState(false);

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

  const [faceMeshStatus, setFaceMeshStatus] = useState('Initializing');
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [faceMeshEnabled, setFaceMeshEnabled] = useState(true);

  const handleFaceMeshRetry = () => {
    setShowRetryButton(false);
    setFaceMeshStatus('Initializing');
    setFaceMeshEnabled(false);
    setTimeout(() => {
      setFaceMeshEnabled(true);
    }, 1000);
  };

  const [selectedLanguage, setSelectedLanguage] = useState('Hebrew');
  const [hebrewQuestions, setHebrewQuestions] = useState([]);
  const [englishQuestions, setEnglishQuestions] = useState([]);
  const [isHebrewLoading, setIsHebrewLoading] = useState(true);
  const [isEnglishLoading, setIsEnglishLoading] = useState(true);
  
  const [hebrewStatus, setHebrewStatus] = useState(null);
  const [englishStatus, setEnglishStatus] = useState(null);
  const [retryCount, setRetryCount] = useState({ hebrew: 0, english: 0 });

  const [faceMeshReady, setFaceMeshReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // State for current video time
  const [playerHeight, setPlayerHeight] = useState(390); // Default player height
  const [showTimeline, setShowTimeline] = useState(true); // State for timeline visibility

  const [noClientPause, setNoClientPause] = useState(false);

  const immediateGaze = useRef('Looking center');
  const immediateGazeChangeTime = useRef(Date.now());
  const stableGaze = useRef('Looking center');
  const stableGazeChangeTime = useRef(Date.now());

  const SMOOTHING_MS = 300;
  const CENTER_THRESHOLD_MS = 100;
  const AWAY_THRESHOLD_MS = 400;

  const MODEL_THRESHOLD = -1.0;
  const [lastModelResult, setLastModelResult] = useState(null);

  const [sensitivity, setSensitivity] = useState(7);

  const [hebrewFetchInterval, setHebrewFetchInterval] = useState(null);
  const [englishFetchInterval, setEnglishFetchInterval] = useState(null);

  // Add AbortController refs
  const hebrewAbortController = useRef(new AbortController());
  const englishAbortController = useRef(new AbortController());

  useEffect(() => {
    setGazeSensitivity(sensitivity);
  }, [sensitivity]);

  useEffect(() => {
    console.log('🔄 Setting up video tracking');
    
    // Create new abort controllers when the component mounts
    hebrewAbortController.current = new AbortController();
    englishAbortController.current = new AbortController();
    
    return () => {
      console.log('🛑 Cleaning up ALL video resources');
      
      // Cancel all pending network requests
      try {
        hebrewAbortController.current.abort();
        englishAbortController.current.abort();
        cancelAllRequests(); // Cancel any other pending requests
      } catch (e) {
        console.error('Error during request cancellation:', e);
      }
      
      // Stop tracking and intervals
      resetTracking();
      handleVideoPause();
      setModelResultCallback(null);
      setVideoPlaying(false);
      
      // Clear question fetch intervals
      if (hebrewFetchInterval) {
        clearInterval(hebrewFetchInterval);
        setHebrewFetchInterval(null);
      }
      if (englishFetchInterval) {
        clearInterval(englishFetchInterval);
        setEnglishFetchInterval(null);
      }
      
      console.log('🧹 Video player cleanup complete');
    };
  }, [hebrewFetchInterval, englishFetchInterval]);

  useEffect(() => {
    let mounted = true;
    fetchLastWatchTime(lectureInfo.videoId).then((time) => {
      if (mounted) {
        setInitialPlaybackTime(time);
        console.log('⏩ Last watched time fetched:', time);
      }
    });
    return () => { mounted = false; };
  }, [lectureInfo.videoId]);

  const userPausedRef = useRef(userPaused);
  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  const questionsRef = useRef(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const questionActiveRef = useRef(null);
  useEffect(() => {
    questionActiveRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    let intervalId = null;
    if (isPlaying && playerRef.current) {
      intervalId = setInterval(() => {
        const time = playerRef.current?.getCurrentTime() || 0;
        setCurrentTime(time);
      }, 1000); // Update every second
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId); // Cleanup interval on unmount or when isPlaying changes
  }, [isPlaying]); // Rerun effect when isPlaying changes

  const handleNoClientPauseToggle = () => {
    window.noStop = !noClientPause;
    setNoClientPause(prev => !prev);
    console.log(`🎮 No Client Pause ${!noClientPause ? 'Enabled' : 'Disabled'}`);
    resetTracking();
  };

  const handleEngagementLogicToggle = useCallback(() => {
    const newState = !disableEngagementLogic;
    setDisableEngagementLogic(newState);
    setEngagementDetectionEnabled(!newState);
  }, [disableEngagementLogic]);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 1000);
    
    // Clear existing resources before creating new ones
    if (hebrewFetchInterval) clearInterval(hebrewFetchInterval);
    if (englishFetchInterval) clearInterval(englishFetchInterval);
    
    // Cancel any in-flight requests
    hebrewAbortController.current.abort();
    englishAbortController.current.abort();
    hebrewAbortController.current = new AbortController();
    englishAbortController.current = new AbortController();
    
    if (mode === 'question') {
      console.log("[DEBUG] Starting questions fetch for:", lectureInfo.videoId);
      
      // Initial fetch for Hebrew with abort signal
      fetchQuestionsWithRetry(
        lectureInfo.videoId,
        'Hebrew',
        setHebrewStatus,
        setIsHebrewLoading,
        setHebrewQuestions,
        selectedLanguage,
        questionsRef,
        setQuestions,
        hebrewAbortController.current
      ).then(result => {
        // Only setup interval if not cancelled and pending
        if (result.pending && !result.cancelled) {
          // Setup retry interval for Hebrew
          setRetryCount(prev => ({ ...prev, hebrew: 1 }));
          let attempt = 1;
          const intervalId = setInterval(() => {
            // Check if component is still mounted via abort signal
            if (hebrewAbortController.current.signal.aborted) {
              clearInterval(intervalId);
              return;
            }
            
            attempt++;
            setRetryCount(prev => ({ ...prev, hebrew: attempt }));
            setHebrewStatus(`Building questions... (${attempt})`);
            
            fetchQuestionsWithRetry(
              lectureInfo.videoId,
              'Hebrew',
              setHebrewStatus,
              setIsHebrewLoading,
              setHebrewQuestions,
              selectedLanguage,
              questionsRef,
              setQuestions,
              hebrewAbortController.current
            ).then(result => {
              if (result.success || !result.pending || result.cancelled) {
                clearInterval(intervalId);
                setHebrewFetchInterval(null);
              }
            }).catch(() => {
              clearInterval(intervalId);
              setHebrewFetchInterval(null);
            });
            
            // Stop after 15 attempts
            if (attempt >= 15) {
              clearInterval(intervalId);
              setHebrewFetchInterval(null);
              setHebrewStatus(`Timed out waiting for questions`);
            }
          }, 5000);
          
          setHebrewFetchInterval(intervalId);
        }
      }).catch(err => {
        console.error("Error in Hebrew question fetch:", err);
      });
      
      // Similar update for English with abort signal
      fetchQuestionsWithRetry(
        lectureInfo.videoId,
        'English',
        setEnglishStatus,
        setIsEnglishLoading,
        setEnglishQuestions,
        selectedLanguage,
        questionsRef,
        setQuestions,
        englishAbortController.current
      ).then(result => {
        if (result.pending && !result.cancelled) {
          // Setup retry interval for English
          setRetryCount(prev => ({ ...prev, english: 1 }));
          let attempt = 1;
          const intervalId = setInterval(() => {
            // Check if component is still mounted via abort signal
            if (englishAbortController.current.signal.aborted) {
              clearInterval(intervalId);
              return;
            }
            
            attempt++;
            setRetryCount(prev => ({ ...prev, english: attempt }));
            setEnglishStatus(`Building questions... (${attempt})`);
            
            fetchQuestionsWithRetry(
              lectureInfo.videoId,
              'English',
              setEnglishStatus,
              setIsEnglishLoading,
              setEnglishQuestions,
              selectedLanguage,
              questionsRef,
              setQuestions,
              englishAbortController.current
            ).then(result => {
              if (result.success || !result.pending || result.cancelled) {
                clearInterval(intervalId);
                setEnglishFetchInterval(null);
              }
            }).catch(() => {
              clearInterval(intervalId);
              setEnglishFetchInterval(null);
            });
            
            // Stop after 15 attempts
            if (attempt >= 15) {
              clearInterval(intervalId);
              setEnglishFetchInterval(null);
              setEnglishStatus(`Timed out waiting for questions`);
            }
          }, 5000);
          
          setEnglishFetchInterval(intervalId);
        }
      }).catch(err => {
        console.error("Error in English question fetch:", err);
      });
    }
    
    return () => {
      // Cancel ongoing operations when dependencies change
      hebrewAbortController.current.abort();
      englishAbortController.current.abort();
      
      if (hebrewFetchInterval) {
        clearInterval(hebrewFetchInterval);
        setHebrewFetchInterval(null);
      }
      if (englishFetchInterval) {
        clearInterval(englishFetchInterval);
        setEnglishFetchInterval(null);
      }
    };
  }, [lectureInfo.videoId, mode, selectedLanguage]);

  const handleLowEngagement = useCallback(() => {
    if (!isPlaying || currentQuestion || isHebrewLoading || isEnglishLoading) return;
    
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      systemPauseRef.current = true;
    }

    if (mode === 'question' && canAskQuestion()) {
      const currentVideoTime = playerRef.current?.getCurrentTime() || 0;
      const availableQuestions = getAvailableQuestions(
        currentVideoTime,
        questionsRef.current,
        answeredQIDs
      );
      
      console.log('debugg: availableQuestions:', availableQuestions);

      if (availableQuestions.length === 0) {
        console.log('debugg: no questions available for this segment');
        setCurrentQuestion({ text: '', answers: [] });
        return;
      }

      const nextQuestion = selectNextQuestion(availableQuestions);
      console.log('debugg: nextQuestion to ask:', nextQuestion);
      if (nextQuestion) {
        markQuestionAsked();
        setCurrentQuestion({
          q_id: nextQuestion.q_id,
          text: nextQuestion.question,
          answers: shuffleAnswers(nextQuestion, selectedLanguage),
          originalTime: parseTimeToSeconds(nextQuestion.question_origin),
          endTime: parseTimeToSeconds(nextQuestion.question_explanation_end)
        });
      }
    }
  }, [
    isPlaying, currentQuestion, mode, selectedLanguage,
    answeredQIDs, isHebrewLoading, isEnglishLoading
  ]);

  const handleVideoPlayback = useCallback((newGaze) => {
    if (userPausedRef.current) return;
    if (noClientPause) return;

    handleEngagementDetection({
      newGaze,
      immediateGaze,
      immediateGazeChangeTime,
      stableGaze,
      stableGazeChangeTime,
      isPlaying,
      currentQuestion,
      playerRef,
      mode,
      questionActiveRef,
      userPausedRef,
      SMOOTHING_MS,
      CENTER_THRESHOLD_MS,
      AWAY_THRESHOLD_MS,
      handleLowEngagement,
      setIsPlaying,
      setPauseStatus,
      setUserPaused
    });
  }, [noClientPause, isPlaying, currentQuestion, mode, handleLowEngagement]);

  const handleFaceMeshResults = useCallback((results) => {
    if (!noClientPause && mode === 'question' && questionActiveRef.current) return;
    updateLatestLandmark(results);
    if (!noClientPause && results?.multiFaceLandmarks?.length > 0) {
      try {
        const gaze = estimateGaze(results.multiFaceLandmarks[0]);
        setFaceMeshStatus('Working');
        handleVideoPlayback(gaze);
      } catch (error) {
        console.error('Gaze estimation error:', error);
        setFaceMeshStatus('Error estimating gaze');
      }
    }
  }, [mode, noClientPause, handleVideoPlayback]);

  const handleFaceMeshStatus = useCallback((status) => {
    setFaceMeshStatus(status);
    if (status === 'FaceMesh Ready') {
      setFaceMeshReady(true);
      if (playerRef.current) {
        setTimeout(() => {
          handleVideoResume(
            lectureInfo.videoId,
            'basic',
            sendIntervalSeconds,
            () => playerRef.current?.getCurrentTime() || 0
          );
        }, 500);
      }
    }
  }, [lectureInfo.videoId, sendIntervalSeconds]);

  useFaceMesh(loaded && isPlaying, webcamRef, handleFaceMeshResults, handleFaceMeshStatus);

  useEffect(() => {
    if (!playerRef.current || !faceMeshReady) return;
    const initTimeout = setTimeout(() => {
      if (playerRef.current && faceMeshReady && !isVideoPaused) {
        handleVideoResume(
          lectureInfo.videoId,
          'basic',
          sendIntervalSeconds,
          () => playerRef.current?.getCurrentTime() || 0
        );
      }
    }, 2000);
    return () => clearTimeout(initTimeout);
  }, [faceMeshReady, playerRef.current, sendIntervalSeconds, lectureInfo.videoId, isVideoPaused]);

  const handleAnswer = (selectedKey) => {
    if (selectedKey === 'continue') {
      setCurrentQuestion(null);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setPauseStatus('Playing');
      setVideoPlaying(true);
      return;
    }

    if (selectedKey === 'dontknow') {
      setStats(prev => ({
        ...prev,
        wrong: prev.wrong + 1
      }));
      setDecisionPending(false);
      return;
    }

    const correctKey = 'answer1';
    const isCorrect = selectedKey === correctKey;
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
      setQuestions(prev => {
        const updated = prev.filter(q => q.q_id !== currentQuestion.q_id);
        return updated;
      });
      setAnsweredQIDs(prev => [...prev, currentQuestion.q_id]);
    }
    setCurrentQuestion(null);
    setDecisionPending(null);
    playerRef.current.playVideo();
    setIsPlaying(true);
    setPauseStatus('Playing');
    setVideoPlaying(true);
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    console.log("Player ready, starting video");

    // Get player dimensions if needed (might be fixed)
    const iframe = playerRef.current.getIframe();
    if (iframe) {
      setPlayerHeight(iframe.offsetHeight);
    }

    if (initialPlaybackTime > 0) {
      console.log(`🔄 Seeking video to ${initialPlaybackTime}s.`);
      playerRef.current.seekTo(initialPlaybackTime, true);
    }

    playerRef.current.playVideo();
    
    setTimeout(() => {
      handleVideoResume(
        lectureInfo.videoId,
        'basic',
        sendIntervalSeconds,
        () => playerRef.current?.getCurrentTime() || 0
      );
      setIsPlaying(true);
      setPauseStatus('Playing');
    }, 1000);

    if (onVideoPlayerReady) onVideoPlayerReady();
  };
  
  const onPlayerStateChange = (event) => {
    const playerState = event.data;
  
    switch (playerState) {
      case 1:
        setIsPlaying(true);
        setPauseStatus('Playing');
        setUserPaused(false);
        setIsVideoPaused(false);
        setVideoPlaying(true);
        handleVideoResume(
          lectureInfo.videoId, 
          'basic', 
          sendIntervalSeconds,
          () => playerRef.current?.getCurrentTime() || 0
        );
        break;
      case 2:
        if (systemPauseRef.current) {
          setPauseStatus('Paused (Not Engaged)');
        } else {
          setPauseStatus('Paused Manually');
          setUserPaused(true);
        }
        setIsPlaying(false);
        setIsVideoPaused(true);
        setVideoPlaying(false);
        handleVideoPause();
        break;
      default:
        break;
    }
  };
  
  const handleIntervalChange = (newValue) => {
    setSendIntervalSeconds(Number(newValue));
  };

  const handleLanguageChange = (language) => {
    serviceHandleLanguageChange(
      language,
      setSelectedLanguage,
      hebrewQuestions,
      englishQuestions,
      questionsRef,
      setQuestions
    );
  };

  useEffect(() => {
    setModelResultCallback((result) => {
      setLastModelResult(result);
      if (noClientPause && result < MODEL_THRESHOLD) {
        handleLowEngagement();
      }
    });

    return () => setModelResultCallback(null); // Ensure callback is removed on unmount or dependency change
  }, [noClientPause, handleLowEngagement]);

  useEffect(() => {
    if (debugTriggerActive) {
      handleLowEngagement();
      setDebugTriggerActive(false);
    }
  }, [debugTriggerActive, handleLowEngagement]);

  const handleResetAnsweredQuestions = () => {
    serviceResetAnsweredQuestions(lectureInfo.videoId, setAnsweredQIDs);
  };

  const handlePlotResults = async () => {
    servicePlotResults(
      lectureInfo.videoId,
      showResultsChart,
      setShowResultsChart,
      setResultsChartData
    );
  }

  const handleToggleTimeline = () => {
    setShowTimeline(prev => !prev);
  };

  // Add handler for seeking to timestamp when a question is clicked
  const handleQuestionClick = useCallback((timestamp) => {
    if (playerRef.current) {
      console.log(`🎯 Seeking to ${formatTime(timestamp)}`);
      playerRef.current.seekTo(timestamp, true);
      
      // If video is paused, play it
      if (!isPlaying) {
        playerRef.current.playVideo();
      }
    }
  }, [isPlaying]);

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

  const renderDebugTools = () => (
    <div className="debug-tools">
      <h3>Debug Tools</h3>
      <div className="sensitivity-control">
        <label> Engagement Sensitivity: {sensitivity}</label>
        <input
          type="range"
          min="0"
          max="10"
          value={sensitivity}
          onChange={e => setSensitivity(+e.target.value)}
        />
      </div>
      <button 
        className="debug-button trigger"
        onClick={() => startManualTrigger()}
      >
        🎯 Trigger Question
      </button>
      <button 
        className="debug-button reset-answers"
        onClick={handleResetAnsweredQuestions}
      >
        🔄 Reset Answered Qs
      </button>
      <button
        className="debug-button"
        onClick={handlePlotResults}
      >
        Plot results
      </button>
      <button
        className="debug-button"
        onClick={handleToggleTimeline}
      >
        {showTimeline ? 'Hide' : 'Show'} Timeline
      </button>
    </div>
  );

  return (
    <div className="video-player-layout video-player-grid-layout"> {/* Main layout container */}

      <div className="video-section"> {/* Wrapper for player and controls */}
        <YouTube
          videoId={lectureInfo.videoId}
          opts={{
            height: String(playerHeight),
            width: '640',
            playerVars: { autoplay: 1, controls: 1, origin: window.location.origin },
          }}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
        />
        {renderStatus()}
        {mode === 'question' && renderDebugTools()}

        {showResultsChart && (
          <div 
            className="results-plot-chart" 
            style={{ 
              width: '90%',
              height: '450px',
              margin: '20px auto'
            }}
          >
            <h3>Focus Results Over Time</h3>
            <Bar
              data={resultsChartData}
              options={{
                maintainAspectRatio: false,
                scales: {
                  x: { title: { display: true, text: 'Video Time (s)' } },
                  y: { title: { display: true, text: 'Concentration' }, min: 0 },
                },
                plugins: { legend: { display: true } },
              }}
            />
          </div>
        )}

        {mode === 'question' && (
          <div className="language-options" style={{ margin: '20px 0', direction: 'ltr' }}>
            <button 
              className={`lang-btn ${selectedLanguage === 'Hebrew' ? 'active' : ''} ${hebrewQuestions.length === 0 ? 'disabled' : ''}`}
              onClick={() => handleLanguageChange('Hebrew')}
              disabled={hebrewQuestions.length === 0 && !hebrewStatus?.includes('Building')}
            >
              Hebrew {hebrewStatus ? (
                hebrewStatus.includes('Building') ? '⌛' : 
                hebrewStatus.includes('No') ? '❌' : '⏳'
              ) : (
                hebrewQuestions.length > 0 ? '✓' : '❌'
              )}
              {hebrewStatus && hebrewStatus.includes('Building') && 
                <span className="status-counter">#{retryCount.hebrew}</span>}
            </button>
            <button 
              className={`lang-btn ${selectedLanguage === 'English' ? 'active' : ''} ${englishQuestions.length === 0 ? 'disabled' : ''}`}
              onClick={() => handleLanguageChange('English')}
              disabled={englishQuestions.length === 0 && !englishStatus?.includes('Building')}
            >
              English {englishStatus ? (
                englishStatus.includes('Building') ? '⌛' : 
                englishStatus.includes('No') ? '❌' : '⏳'
              ) : (
                englishQuestions.length > 0 ? '✓' : '❌'
              )}
              {englishStatus && englishStatus.includes('Building') && 
                <span className="status-counter">#{retryCount.english}</span>}
            </button>
          </div>
        )}
        
        {mode === 'question' && (hebrewStatus || englishStatus) && (
          <div className="question-generation-status" style={{ margin: '10px 0 20px', textAlign: 'center' }}>
            {selectedLanguage === 'Hebrew' && hebrewStatus && (
              <div className="status-message">
                {hebrewStatus.includes('No') ? (
                  <span className="error-icon">⚠️</span>
                ) : (
                  <span className="spinner small"></span>
                )}
                {hebrewStatus}
              </div>
            )}
            {selectedLanguage === 'English' && englishStatus && (
              <div className="status-message">
                {englishStatus.includes('No') ? (
                  <span className="error-icon">⚠️</span>
                ) : (
                  <span className="spinner small"></span>
                )}
                {englishStatus}
              </div>
            )}
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
            {showResultsChart && (
              <Bar
                data={resultsChartData}
                options={{
                  scales: {
                    x: { title: { display: true, text: 'Time (s)' } },
                    y: { title: { display: true, text: 'Focus' }, min: 0, max: 1 },
                  },
                  plugins: { legend: { display: true } },
                }}
              />
            )}
          </div>
        )}
      </div> {/* End of video-section */}

      {mode === 'question' && showTimeline && (
        <div className="timeline-section"> {/* Wrapper for the timeline */}
          <QuestionTimeline
            questions={questions}
            currentTime={currentTime}
            language={selectedLanguage}
            playerHeight={playerHeight}
            onQuestionClick={handleQuestionClick}
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