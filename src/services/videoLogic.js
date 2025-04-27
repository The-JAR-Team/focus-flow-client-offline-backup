// services/videoLogic.js

// Engagement detection state
let isEngagementDetectionEnabled = true;

// Question cooldown state
let lastQuestionTime = 0;
const QUESTION_COOLDOWN = 3000; // 3 seconds cooldown between questions
let videoPlaying = false;

// Add simulation state
let manualTriggerActive = false;
let manualTriggerStartTime = 0;
const MANUAL_TRIGGER_DURATION = 500; // Duration to simulate looking away (ms)

export const setEngagementDetectionEnabled = (enabled) => {
  isEngagementDetectionEnabled = enabled;
};

export const getEngagementDetectionEnabled = () => {
  return isEngagementDetectionEnabled;
};

export const setVideoPlaying = (isPlaying) => {
  videoPlaying = isPlaying;
  // Reset cooldown when video starts playing
  if (isPlaying) {
    lastQuestionTime = Date.now();
  }
};

export const canAskQuestion = () => {
  if (!videoPlaying) return false;
  const now = Date.now();
  return now - lastQuestionTime >= QUESTION_COOLDOWN;
};

export const markQuestionAsked = () => {
  lastQuestionTime = Date.now();
};

export const startManualTrigger = () => {
  manualTriggerActive = true;
  manualTriggerStartTime = Date.now();
};

// Question handling logic
export const handleEngagementDetection = ({
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
}) => {
  if (!isEngagementDetectionEnabled && !manualTriggerActive) {
    return;
  }

  const now = Date.now();

  // Handle manual trigger simulation
  if (manualTriggerActive) {
    const timeInSimulation = now - manualTriggerStartTime;
    if (timeInSimulation >= MANUAL_TRIGGER_DURATION) {
      manualTriggerActive = false; // Reset the trigger
      if (isPlaying) {
        handleLowEngagement();
      }
      return;
    }
    // Force "looking away" state during simulation
    newGaze = 'Looking left';
  }

  // Regular gaze handling
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

  if (stableGaze.current === 'Looking center') {
    if (mode === 'question' && questionActiveRef.current) return;
    const ytState = playerRef.current?.getPlayerState?.();
    const isActuallyPaused = ytState !== 1;
    const shouldResume = isActuallyPaused && !userPausedRef.current && stableDuration >= CENTER_THRESHOLD_MS;
    
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
    if (isPlaying && stableDuration >= AWAY_THRESHOLD_MS) {
      if (canAskQuestion()) {
        handleLowEngagement();
        markQuestionAsked();
      }
    }
  }
};

export const getAvailableQuestions = (currentTime, allQuestions, answeredQIDs) => {
  if (!allQuestions || !Array.isArray(allQuestions)) return [];
  
  const timeWindowStart = Math.max(0, currentTime - 300); // 5 minutes back
  const timeWindowEnd = currentTime + 60; // 1 minute ahead
  
  return allQuestions.filter(q => {
    const questionTime = parseTimeToSeconds(q.question_origin);
    return (
      !answeredQIDs.includes(q.q_id) && // Not already answered
      questionTime >= timeWindowStart && 
      questionTime <= timeWindowEnd
    );
  });
};

export const estimateGaze = (landmarks) => {
  // Don't process gaze if engagement detection is disabled
  if (!isEngagementDetectionEnabled) {
    return 'Looking center'; // Always return center when disabled
  }

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

  const leftGazeRatio = (leftEye.center.x - leftEye.outer.x) / (leftEye.inner.x - leftEye.outer.x);
  const rightGazeRatio = (rightEye.center.x - rightEye.outer.x) / (rightEye.inner.x - rightEye.outer.x);

  const avgGazeRatio = (leftGazeRatio + rightGazeRatio) / 2;
  if (avgGazeRatio < 0.42) return 'Looking left';
  if (avgGazeRatio > 0.58) return 'Looking right';
  return 'Looking center';
};
