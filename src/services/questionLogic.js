// questionLogic.js
export function parseTimeToSeconds(timeStr) {
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
  

  export function getAvailableQuestions(currentTime, questions, answeredQIDs) {
    return questions.filter(q => {
      const qSec = parseTimeToSeconds(q.time_start_I_can_ask_about_it);
      return qSec <= currentTime && !answeredQIDs.includes(q.q_id);
    });
  }
  
  export function selectNextQuestion(availableQuestions) {
    if (!availableQuestions || availableQuestions.length === 0) return null;
    return availableQuestions.reduce((prev, curr) =>
      parseTimeToSeconds(curr.time_start_I_can_ask_about_it) >
        parseTimeToSeconds(prev.time_start_I_can_ask_about_it)
        ? curr
        : prev
    );
  }