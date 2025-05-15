// services/videoLogic.js

// Engagement detection state
let isEngagementDetectionEnabled = true;

// Question cooldown state
let lastQuestionTime = 0;
const QUESTION_COOLDOWN = 3000; // 3 seconds cooldown between questions
let videoPlaying = true; // Set default to true to avoid initial state issues

// Add simulation state
let manualTriggerActive = false;
let manualTriggerStartTime = 0;
const MANUAL_TRIGGER_DURATION = 500; // Duration to simulate looking away (ms)

// Force trigger for manual actions
let forceQuestionTrigger = false;

// Gaze sensitivity state
let gazeSensitivity = 5;
export const setGazeSensitivity = (v) => { gazeSensitivity = v; };

export const setEngagementDetectionEnabled = (enabled) => {
  isEngagementDetectionEnabled = enabled;
};

export const getEngagementDetectionEnabled = () => {
  return isEngagementDetectionEnabled;
};

export const setVideoPlaying = (isPlaying) => {
  // Store previous state for logging
  const wasPlaying = videoPlaying;
  videoPlaying = isPlaying;
  
  // Log state changes for debugging
  console.log(`[DEBUGQ] Video playing state: ${wasPlaying} → ${isPlaying}`);
  
  // Reset cooldown when video starts playing
  if (isPlaying) {
    lastQuestionTime = Date.now();
    console.log('[DEBUGQ] Cooldown timer reset due to video start playing');
  }
};

export const canAskQuestion = () => {
  // Always allow questions if force trigger is set
  if (forceQuestionTrigger) {
    console.log('[DEBUGQ] Force question trigger active, bypassing cooldown check');
    forceQuestionTrigger = false; // Reset the flag after use
    return true;
  }
  
  // Don't check videoPlaying flag anymore as it causes issues
  const now = Date.now();
  const timeSinceLast = now - lastQuestionTime;
  const canAsk = timeSinceLast >= QUESTION_COOLDOWN;
  
  // Only log if we're being prevented by cooldown
  if (!canAsk) {
    console.log(`[DEBUGQ] Question cooldown active, waiting ${QUESTION_COOLDOWN - timeSinceLast} ms`);
  }
  
  return canAsk;
};

export const markQuestionAsked = () => {
  const previousTime = lastQuestionTime;
  lastQuestionTime = Date.now();
  console.log(`[DEBUGQ] Question cooldown timer reset at ${new Date(lastQuestionTime).toLocaleTimeString()}, was ${Date.now() - previousTime}ms old`);
};

export const startManualTrigger = () => {
  manualTriggerActive = true;
  manualTriggerStartTime = Date.now();
  // Set force trigger to bypass cooldown for manual triggers
  forceQuestionTrigger = true;
  console.log('[DEBUGQ] Manual trigger activated at', new Date().toLocaleTimeString(), '(force trigger enabled)');
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
  // Skip if engagement detection is disabled and no manual trigger is active
  if (!isEngagementDetectionEnabled && !manualTriggerActive) {
    console.log('[DEBUGQ] Engagement detection disabled, skipping');
    return;
  }

  const now = Date.now();

  // Handle manual trigger simulation
  if (manualTriggerActive) {
    const timeInSimulation = now - manualTriggerStartTime;
    console.log(`[DEBUGQ] Manual trigger in progress: ${timeInSimulation}ms / ${MANUAL_TRIGGER_DURATION}ms`);
    
    if (timeInSimulation >= MANUAL_TRIGGER_DURATION) {
      manualTriggerActive = false; // Reset the trigger
      console.log('[DEBUGQ] Manual trigger completed, calling handleLowEngagement');
      handleLowEngagement();
      return;
    }
    // Force "looking away" state during simulation
    newGaze = 'Looking left';
  }

  // Log gaze for debugging
  //console.log('[DEBUGQ] Processing gaze:', newGaze, 'current gaze:', immediateGaze.current);

  // Regular gaze handling
  if (newGaze !== immediateGaze.current) {
    immediateGaze.current = newGaze;
    immediateGazeChangeTime.current = now;
    console.log('[DEBUGQ] Gaze changed to', newGaze, 'at', new Date(now).toLocaleTimeString());
  }

  const timeSinceImmediateChange = now - immediateGazeChangeTime.current;
  if (timeSinceImmediateChange >= SMOOTHING_MS) {
    if (stableGaze.current !== immediateGaze.current) {
      stableGaze.current = immediateGaze.current;
      stableGazeChangeTime.current = now;
      console.log('[DEBUGQ] Stable gaze updated to', stableGaze.current);
    }
  }

  const stableDuration = now - stableGazeChangeTime.current;

  // Don't do gaze-based actions if there's a question currently shown
  if (questionActiveRef.current) {
    console.log('[DEBUGQ] Question is active, skipping engagement actions');
    return;
  }

  if (stableGaze.current === 'Looking center') {
    // Auto-resume playback when looking back at center
    const ytState = playerRef.current?.getPlayerState?.();
    const isActuallyPaused = ytState !== 1;
    const shouldResume = isActuallyPaused && !userPausedRef.current && stableDuration >= CENTER_THRESHOLD_MS;
    
    if (shouldResume && playerRef.current && !window.noStop) {
      console.log('[DEBUGQ] Looking center for', stableDuration, 'ms, resuming video');
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
    // When looking away, check if we're playing and should trigger question
    if (isPlaying && stableDuration >= AWAY_THRESHOLD_MS) {
      console.log('[DEBUGQ] Looking away (', stableGaze.current, ') for', stableDuration, 'ms, checking if can ask question');
      if (canAskQuestion()) {
        console.log('[DEBUGQ] Not looking center for', stableDuration, 'ms, triggering question');
        handleLowEngagement();
        markQuestionAsked();
      } else {
        console.log('[DEBUGQ] Question cooldown active, waiting', QUESTION_COOLDOWN - (now - lastQuestionTime), 'ms');
      }
    }
  }
};

export const getAvailableQuestions = (currentTime, allQuestions, answeredQIDs) => {
  if (!allQuestions || !Array.isArray(allQuestions)) return [];
  
  const timeWindowStart = Math.max(0, currentTime - 400); 
  //const timeWindowEnd = currentTime; // Only include questions up to the current time
  //Optional windowEnd smaller for cerful.. (if gemini chose badly timing....)
  const timeWindowEnd = currentTime-3; 
  return allQuestions.filter(q => {
    //const questionTime = parseTimeToSeconds(q.question_explanation_end);
    const questionTime = parseTimeToSeconds(q.question_explanation_end);
    return (
      !answeredQIDs.includes(q.q_id) && // Not already answered
      questionTime >= timeWindowStart && 
      questionTime <= timeWindowEnd
    );
  });
};

export const estimateGaze = (landmarks) => {
  // Treat 0 sensitivity as “always center”
  if (!isEngagementDetectionEnabled || gazeSensitivity === 0) {
    return 'Looking center';
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

  // Dynamic dead‑zone: higher sensitivity → narrower center band
  const range = ((10 - gazeSensitivity) / 10) * 0.5;
  const low = 0.5 - range;
  const high = 0.5 + range;

  if (avgGazeRatio < low) return 'Looking left';
  if (avgGazeRatio > high) return 'Looking right';
  return 'Looking center';
};
