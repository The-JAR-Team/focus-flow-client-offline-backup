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
  
  console.log(`[DEBUG] Looking for last unanswered question before ${currentTime}s`);
  
  // Convert all question times to seconds and sort by time
  const sortedQuestions = questions
    .filter(q => !answeredQIDs.includes(q.q_id))
    .map(q => ({
      ...q,
      timeInSeconds: parseTimeToSeconds(q.question_origin)
    }))
    .sort((a, b) => b.timeInSeconds - a.timeInSeconds); // Sort descending
    
  // Find the first question that's before current time
  const nextQuestion = sortedQuestions.find(q => q.timeInSeconds <= currentTime);
  
  console.log(`[DEBUG] Found question:`, nextQuestion?.q_id);
  return nextQuestion ? [nextQuestion] : [];
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