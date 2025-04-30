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
  const [sendIntervalSeconds, setSendIntervalSeconds] = useState(10);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pauseStatus, setPauseStatus] = useState('Playing');
  const [userPaused, setUserPaused] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);

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

  // Function to fetch questions with retry logic
  const fetchQuestionsWithRetry = async (videoId, language, maxRetries = 15) => {
    const statusSetter = language === 'Hebrew' ? setHebrewStatus : setEnglishStatus;
    const loadingSetter = language === 'Hebrew' ? setIsHebrewLoading : setIsEnglishLoading;
    const questionsSetter = language === 'Hebrew' ? setHebrewQuestions : setEnglishQuestions;
    const retryCountKey = language.toLowerCase();
    
    loadingSetter(true);
    statusSetter(`Starting ${language} question generation...`);
    
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          setRetryCount(prev => ({ ...prev, [retryCountKey]: attempt }));
        }
        
        const data = await fetchTranscriptQuestions(videoId, language);
        
        // Check for transcript not available error
        if (data.status === 'failed' && 
            data.reason && 
            data.reason.includes('Could not retrieve a transcript')) {
          statusSetter(`No ${language} subtitles`);
          loadingSetter(false);
          return [];
        }
        
        // Check for pending status
        if (data.status === 'pending' || data.reason === 'Generation already in progress by another request.') {
          statusSetter(`Building questions... (${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds before retrying
          continue;
        }
        
        // Extract questions from response
        const questionsArray = [
          ...(data.video_questions?.questions || []),
          ...(data.generic_questions?.questions || []),
          ...(data.subject_questions?.questions || [])
        ];
        
        if (questionsArray.length > 0) {
          const sortedQuestions = questionsArray.sort((a, b) => {
            return (parseTimeToSeconds(a.question_origin) || 0) - (parseTimeToSeconds(b.question_origin) || 0);
          });
          
          questionsSetter(sortedQuestions);
          statusSetter(null);
          
          // If this is the current language, update the main questions state too
          if (selectedLanguage === language) {
            questionsRef.current = sortedQuestions;
            setQuestions(sortedQuestions);
          }
          
          loadingSetter(false);
          return sortedQuestions;
        } else {
          statusSetter(`No questions available`);
          loadingSetter(false);
          return [];
        }
      }
      
      // If we've exhausted all retries
      statusSetter(`Timed out waiting for questions`);
      loadingSetter(false);
      return [];
      
    } catch (err) {
      console.error(`Error fetching ${language} questions:`, err);
      statusSetter(`Error: ${err.message}`);
      loadingSetter(false);
      return [];
    }
  };

  // Replace the question fetching logic in useEffect
  useEffect(() => {
    setTimeout(() => setLoaded(true), 1000);
    if (mode === 'question') {
      console.log("[DEBUG] Starting questions fetch for:", lectureInfo.videoId);
      
      // Start fetch with retry for both languages
      fetchQuestionsWithRetry(lectureInfo.videoId, 'Hebrew');
      fetchQuestionsWithRetry(lectureInfo.videoId, 'English');
    }
  }, [lectureInfo.videoId, mode]);

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
    if (isPlaying && faceMeshReady && playerRef.current) {
      handleVideoResume(
        lectureInfo.videoId, 
        'basic', 
        sendIntervalSeconds,
        () => playerRef.current?.getCurrentTime() || 0
      );
    }
  }, [sendIntervalSeconds]);

  // Add this useEffect to properly handle mode changes
  useEffect(() => {
    // When switching modes, ensure we properly set up tracking
    if (playerRef.current && faceMeshReady) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        handleVideoResume(
          lectureInfo.videoId,
          'basic',
          sendIntervalSeconds,
          () => playerRef.current?.getCurrentTime() || 0
        );
      }, 500);
    }
  }, [noClientPause]);

  // Define handleLowEngagement first since it's used in other function dependencies
  const handleLowEngagement = useCallback(() => {
    if (!isPlaying || currentQuestion) return;

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

      if (availableQuestions.length > 0) {
        const nextQuestion = selectNextQuestion(availableQuestions);
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
    }
  }, [mode, isPlaying, currentQuestion, selectedLanguage, answeredQIDs]);

  // Then define handleVideoPlayback which uses handleLowEngagement
  const handleVideoPlayback = useCallback((newGaze) => {
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
  
    if (initialPlaybackTime > 0) {
      console.log(`🔄 Seeking video to ${initialPlaybackTime}s.`);
      playerRef.current.seekTo(initialPlaybackTime, true);
    }
  
    // Start playing and initialize tracking
    playerRef.current.playVideo();
    
    // Small delay to ensure player state is updated
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
      case 1: // Playing
        setIsPlaying(true);
        setPauseStatus('Playing');
        setUserPaused(false);
        setIsVideoPaused(false);
        setVideoPlaying(true); // Add this line
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
        setVideoPlaying(false); // Add this line
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