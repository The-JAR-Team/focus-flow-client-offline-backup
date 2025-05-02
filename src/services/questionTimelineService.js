import { parseTimeToSeconds } from './videoPlayerService'; // Import from the new location

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export const processQuestionsForTimeline = (questions) => {
  if (!questions || questions.length === 0) return [];
  return questions
    .map(q => ({
      ...q,
      startTime: parseTimeToSeconds(q.question_origin),
      endTime: q.question_explanation_end ? parseTimeToSeconds(q.question_explanation_end) : (parseTimeToSeconds(q.question_origin) + 15) // Default 15s if no end time
    }))
    .sort((a, b) => a.startTime - b.startTime);
};

export const findNextQuestionIndex = (processedQuestions, currentTime) => {
  let foundIndex = -1;
  for (let i = 0; i < processedQuestions.length; i++) {
    if (processedQuestions[i].startTime > currentTime) {
      foundIndex = i;
      break;
    }
  }
  // If no future question, check if the last question is currently active
  if (foundIndex === -1 && processedQuestions.length > 0) {
    const lastQuestion = processedQuestions[processedQuestions.length - 1];
    if (currentTime >= lastQuestion.startTime && currentTime < lastQuestion.endTime) {
      foundIndex = processedQuestions.length - 1; // Highlight the last one if it's active
    } else if (currentTime >= lastQuestion.endTime) {
      foundIndex = processedQuestions.length; // Indicate end of questions
    }
  }
  return foundIndex;
};
