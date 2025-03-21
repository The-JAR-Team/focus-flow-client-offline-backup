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
  