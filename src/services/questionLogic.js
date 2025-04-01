// questionLogic.js
export function parseTimeToSeconds(timeStr) {
  if (typeof timeStr === 'number') return timeStr;
  const [hh, mm, ss] = timeStr.split(':').map(Number);
  return hh * 3600 + mm * 60 + ss;
}

export function shuffleAnswers(question) {
  const options = [
    { key: 'answer1', text: question.answer1, correct: true },
    { key: 'answer2', text: question.answer2, correct: false },
    { key: 'answer3', text: question.answer3, correct: false },
    { key: 'answer4', text: question.answer4, correct: false },
  ];

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

export const getAvailableQuestions = (currentTime, questions, answeredQIDs) => {
  if (!Array.isArray(questions)) return [];

  const TIME_WINDOW = 1500 * 60; 
  
  const available = questions
    .filter(q => {
      if (!q || !q.question_origin) return false;
      
      const questionTime = parseTimeToSeconds(q.question_origin);
      // Only allow questions if we've passed their start time
      const timeDiff = currentTime - questionTime;
      
      console.log("[DEBUG] Question availability check:", {
        qid: q.q_id,
        questionTime,
        currentTime,
        timeDiff,
        isWithinWindow: timeDiff >= 0 && timeDiff < TIME_WINDOW,
        alreadyAnswered: answeredQIDs.includes(q.q_id)
      });
      
      // Question is available if:
      // 1. We've passed its start time (timeDiff >= 0)
      // 2. We're within the time window
      // 3. It hasn't been answered yet
      return !answeredQIDs.includes(q.q_id) && 
             timeDiff >= 0 && 
             timeDiff < TIME_WINDOW;
    })
    .sort((a, b) => {
      const timeA = parseTimeToSeconds(a.question_origin);
      const timeB = parseTimeToSeconds(b.question_origin);
      return timeA - timeB; // Sort by earliest first
    });

  return available;
};

export function selectNextQuestion(availableQuestions) {
  if (!Array.isArray(availableQuestions) || availableQuestions.length === 0) return null;
  // Just return the first question since they're already sorted by proximity to current time
  return availableQuestions[0];
}