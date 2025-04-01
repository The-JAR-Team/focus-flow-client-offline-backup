// questionLogic.js
export const parseTimeToSeconds = (timeStr) => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    // Handle HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return (hours * 3600) + (minutes * 60) + seconds;
  } else {
    // Handle MM:SS format
    const [minutes, seconds] = parts;
    return (minutes * 60) + seconds;
  }
};

export const getAvailableQuestions = (currentTime, questions, answeredQIDs) => {
  if (!questions || !Array.isArray(questions)) return [];
  
  const TIME_WINDOW_BEFORE = 100; // 5 seconds before current time
  const TIME_WINDOW_AFTER = 100; // 10 seconds ahead of current time
  
  console.log(`[DEBUG] Time windows: -${TIME_WINDOW_BEFORE}s to +${TIME_WINDOW_AFTER}s`);
  console.log(`[DEBUG] Current video time: ${currentTime}`);
  console.log(`[DEBUG] Valid time range: ${currentTime - TIME_WINDOW_BEFORE} to ${currentTime + TIME_WINDOW_AFTER}`);
  
  return questions.filter(q => {
    // Skip if already answered
    if (answeredQIDs.includes(q.q_id)) {
      console.log(`[DEBUG] Question ${q.q_id} already answered, skipping`);
      return false;
    }
    
    // Convert question time to seconds
    const questionTime = parseTimeToSeconds(q.question_origin);
    console.log(`[DEBUG] Question ${q.q_id} time: ${q.question_origin} (${questionTime}s)`);
    
    // Only show questions that are within -5/+10 seconds of current time
    const isInTimeWindow = questionTime >= (currentTime - TIME_WINDOW_BEFORE) && 
                          questionTime <= (currentTime + TIME_WINDOW_AFTER);
    
    console.log(`[DEBUG] Question ${q.q_id} in time window? ${isInTimeWindow}`);
    return isInTimeWindow;
  });
};

export const selectNextQuestion = (availableQuestions) => {
  if (availableQuestions.length === 0) return null;
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
};

export const shuffleAnswers = (question) => {
  const answers = [
    { key: 'answer1', text: question.answer1 },
    { key: 'answer2', text: question.answer2 },
    { key: 'answer3', text: question.answer3 },
    { key: 'answer4', text: question.answer4 }
  ];
  
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
};