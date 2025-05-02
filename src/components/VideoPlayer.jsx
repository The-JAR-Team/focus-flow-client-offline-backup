import React, { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { Bar } from 'react-chartjs-2';
import '../styles/VideoPlayer.css';
import '../styles/TriviaVideoPage.css'; // Add this import for button styles

import {
  fetchLastWatchTime,
  resetTracking,
  updateLatestLandmark,
  handleVideoPause,
  handleVideoResume,
  setModelResultCallback,
  fetchTranscriptQuestions,
  fetchWatchItemResults
} from '../services/videos';

// Import the new services
import { 
  fetchQuestionsWithRetry,
  selectQuestionForCurrentTime 
} from '../services/questionService';

import { 
  initializeVideoPlayer,
  handlePlayerStateChange,
  fetchAndProcessResults,
  PLAYER_STATES
} from '../services/videoPlayerService';

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
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
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

  // Debug tools state - moved to top
  const [disableEngagementLogic, setDisableEngagementLogic] = useState(false);
  const [debugTriggerActive, setDebugTriggerActive] = useState(false);

  const [initialPlaybackTime, setInitialPlaybackTime] = useState(0);
  const [sendIntervalSeconds, setSendIntervalSeconds] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState('Playing');
  const [userPaused, setUserPaused] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  // New state for the results plot
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
  
  const [hebrewStatus, setHebrewStatus] = useState(null);
  const [englishStatus, setEnglishStatus] = useState(null);
  const [retryCount, setRetryCount] = useState({ hebrew: 0, english: 0 });

  const [faceMeshReady, setFaceMeshReady] = useState(false);

  const [noClientPause, setNoClientPause] = useState(false);

  const immediateGaze = useRef('Looking center');
  const immediateGazeChangeTime = useRef(Date.now());
  const stableGaze = useRef('Looking center');
  const stableGazeChangeTime = useRef(Date.now());

  const SMOOTHING_MS = 300;
  const CENTER_THRESHOLD_MS = 100;
  const AWAY_THRESHOLD_MS = 400;

  const MODEL_THRESHOLD = -1.0; // Threshold for model results
  const [lastModelResult, setLastModelResult] = useState(null);

  const [sensitivity, setSensitivity] = useState(7);

  useEffect(() => {
    setGazeSensitivity(sensitivity);
  }, [sensitivity]);

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

  const handleNoClientPauseToggle = () => {
    // First update the window flag
    window.noStop = !noClientPause;
    // Then update the state
    setNoClientPause(prev => !prev);
    console.log(`🎮 No Client Pause ${!noClientPause ? 'Enabled' : 'Disabled'}`);

    // Reset tracking state whenever we switch modes
    resetTracking();
  };

  // Update the toggle handler
  const handleEngagementLogicToggle = useCallback(() => {
    const newState = !disableEngagementLogic;
    setDisableEngagementLogic(newState);
    setEngagementDetectionEnabled(!newState); // Opposite of disable state
  }, [disableEngagementLogic]);

  // Replace fetchQuestionsWithRetry with the service version
  useEffect(() => {
    setTimeout(() => setLoaded(true), 1000);
    if (mode === 'question') {
      console.log("[DEBUG] Starting questions fetch for:", lectureInfo.videoId);
      
      // Start fetch with retry for both languages
      fetchQuestionsWithRetry(
        lectureInfo.videoId, 
        'Hebrew',
        setHebrewStatus,
        setIsHebrewLoading,
        setHebrewQuestions,
        setRetryCount
      );
      
      fetchQuestionsWithRetry(
        lectureInfo.videoId,
        'English',
        setEnglishStatus,
        setIsEnglishLoading,
        setEnglishQuestions,
        setRetryCount
      );
    }
  }, [lectureInfo.videoId, mode]);

  // new: track when both question sets have loaded
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  useEffect(() => {
    if (!isHebrewLoading && !isEnglishLoading) {
      setQuestionsLoaded(true);
    }
  }, [isHebrewLoading, isEnglishLoading]);

  // Define handleLowEngagement using the question service
  const handleLowEngagement = useCallback(() => {
    if (!isPlaying || currentQuestion || !questionsLoaded) return;
    
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      systemPauseRef.current = true;
    }

    if (mode === 'question' && canAskQuestion()) {
      const currentVideoTime = playerRef.current?.getCurrentTime() || 0;
      
      const nextQuestionData = selectQuestionForCurrentTime(
        currentVideoTime,
        questionsRef.current,
        answeredQIDs,
        selectedLanguage
      );
      
      if (!nextQuestionData) {
        console.log('debugg: no questions available for this segment');
        setCurrentQuestion({ text: '', answers: [] });
        return;
      }
      
      markQuestionAsked();
      setCurrentQuestion(nextQuestionData);
    }
  }, [
    isPlaying, currentQuestion, mode, selectedLanguage,
    answeredQIDs, questionsLoaded
  ]);

  // Then define handleVideoPlayback which uses handleLowEngagement
  const handleVideoPlayback = useCallback((newGaze) => {
    // skip all engagement logic if user manually paused
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

  // Finally define handleFaceMeshResults which uses handleVideoPlayback
  const handleFaceMeshResults = useCallback((results) => {
    if (!noClientPause && mode === 'question' && questionActiveRef.current) return;
    
    // Always update landmarks for server processing
    updateLatestLandmark(results);
    
    // Only process gaze for client-side pausing
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

  // Update the FaceMesh status handler
  const handleFaceMeshStatus = useCallback((status) => {
    setFaceMeshStatus(status);
    if (status === 'FaceMesh Ready') {
      setFaceMeshReady(true);
      // Initialize tracking immediately when FaceMesh is ready
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

  // Use the shared FaceMesh hook with the new status handler
  useFaceMesh(loaded && isPlaying, webcamRef, handleFaceMeshResults, handleFaceMeshStatus);

  // Add effect to handle initialization
  useEffect(() => {
    if (!playerRef.current || !faceMeshReady) return;

    // Initialize tracking with a short delay to ensure everything is ready
    const initTimeout = setTimeout(() => {
      if (playerRef.current && faceMeshReady && !isVideoPaused) {
        handleVideoResume(
          lectureInfo.videoId,
          'basic',
          sendIntervalSeconds,
          () => playerRef.current?.getCurrentTime() || 0
        );
      }
    }, 2000); // Give extra time for FaceMesh to fully initialize

    return () => clearTimeout(initTimeout);
  }, [faceMeshReady, playerRef.current, sendIntervalSeconds, lectureInfo.videoId, isVideoPaused]);

  const handleAnswer = (selectedKey) => {
    // Handle the 'continue' action from the attention check modal
    if (selectedKey === 'continue') {
      setCurrentQuestion(null);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setPauseStatus('Playing');
      setVideoPlaying(true);
      return; // Skip the rest of the logic for normal answers
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

  // Update onPlayerReady to use the videoPlayerService
  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    console.log("Player ready, starting video");
    
    initializeVideoPlayer(
      playerRef,
      initialPlaybackTime, 
      lectureInfo.videoId,
      sendIntervalSeconds,
      setIsPlaying,
      setPauseStatus
    );
    
    if (onVideoPlayerReady) onVideoPlayerReady();
  };
  
  // Update onPlayerStateChange to use the videoPlayerService
  const onPlayerStateChange = (event) => {
    handlePlayerStateChange(
      event,
      playerRef,
      lectureInfo.videoId, 
      sendIntervalSeconds,
      systemPauseRef,
      setIsPlaying,
      setPauseStatus,
      setUserPaused,
      setIsVideoPaused,
      setVideoPlaying
    );
  };

  // Update the interval change handler
  const handleIntervalChange = (newValue) => {
    setSendIntervalSeconds(Number(newValue));
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    if (language === 'Hebrew') {
      questionsRef.current = hebrewQuestions;
      setQuestions(hebrewQuestions);
    } else {
      questionsRef.current = englishQuestions;
      setQuestions(englishQuestions);
    }
  };

  // Setup model result handling
  useEffect(() => {
    setModelResultCallback((result) => {
      setLastModelResult(result);
      if (noClientPause && result < MODEL_THRESHOLD) {
        handleLowEngagement();
      }
    });

    return () => setModelResultCallback(null);
  }, [noClientPause, handleLowEngagement]);

  // Add this after other useEffect hooks
  useEffect(() => {
    if (debugTriggerActive) {
      handleLowEngagement();
      setDebugTriggerActive(false);
    }
  }, [debugTriggerActive, handleLowEngagement]);

  // Function to reset answered questions
  const handleResetAnsweredQuestions = () => {
    setAnsweredQIDs([]);
    localStorage.removeItem(`answeredQuestions_${lectureInfo.videoId}`);
    console.log(`debugg: Answered questions reset for video ${lectureInfo.videoId}`);
  };

  // Update handlePlotResults to use the service
  const handlePlotResults = async() => {
    // Toggle visibility if chart is already shown
    if (showResultsChart) {
      setShowResultsChart(false);
      return;
    }
    
    fetchAndProcessResults(
      lectureInfo.videoId, 
      setResultsChartData, 
      setShowResultsChart
    );
  };

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

  // Update the renderDebugTools to use the new toggle handler
  const renderDebugTools = () => (
    <div className="debug-tools">
      <h3>Debug Tools</h3>
      {/*<button 
        className={`debug-button ${disableEngagementLogic ? 'active' : ''}`}
        onClick={handleEngagementLogicToggle}
      >
        {disableEngagementLogic ? '🔓 Engagement Logic: OFF' : '🔒 Engagement Logic: ON'}
      </button>*/}
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
      {/* Add the reset button */}
      <button 
        className="debug-button reset-answers"
        onClick={handleResetAnsweredQuestions}
      >
        🔄 Reset Answered Qs
      </button>
      {/* Button for getting results' plot */}
      <button
        className="debug-button"
        onClick={handlePlotResults}
      >
        Plot results
      </button>
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
      {mode === 'question' && renderDebugTools()}

      {/* Conditionally render the new results chart */}
      {showResultsChart && (
        <div 
          className="results-plot-chart" 
          style={{ 
            width: '90%', // Use percentage width for responsiveness
            height: '450px', // Set a fixed height, otherwise is sliiiiiiiides down
            margin: '20px auto' // Center the chart
          }}
        >
          <h3>Focus Results Over Time</h3>
          <Bar
            data={resultsChartData}
            options={{
              maintainAspectRatio: false, // Allow chart to fill container height
              scales: {
                x: { title: { display: true, text: 'Video Time (s)' } },
                y: { title: { display: true, text: 'Concentration' }, min: 0 }, // Adjust min/max if needed
              },
              plugins: { legend: { display: true } }, // Show legend for this chart
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
      
      {/* Status message moved below the language options */}
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