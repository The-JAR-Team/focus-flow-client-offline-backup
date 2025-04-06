// components/QuestionModals.jsx
import { useEffect, useState } from 'react';

export function QuestionModal({ question, onAnswer, language }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ direction: language === 'Hebrew' ? 'rtl' : 'ltr' }}>
        <h3>{language === 'Hebrew' ? 'שאלה:' : 'Question:'}</h3>
        <p>{question.text}</p>
        <div className="answers">
          {question.answers.map((ans) => (
            <button key={ans.key} onClick={() => onAnswer(ans.key)}>
              {ans.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DecisionModal({ isCorrect, onDecision, language }) {
  const [timer, setTimer] = useState(2);

  useEffect(() => {
    let interval;
    if (isCorrect) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onDecision('continue');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCorrect, onDecision]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ direction: language === 'Hebrew' ? 'rtl' : 'ltr' }}>
        <h3>{isCorrect ? (language === 'Hebrew' ? 'נכון!' : 'Correct!') : (language === 'Hebrew' ? 'לא נכון.' : 'Incorrect.')}</h3>
        {isCorrect ? (
          <p>{language === 'Hebrew' ? `ממשיך בעוד ${timer}...` : `Continuing in ${timer}...`}</p>
        ) : (
          <>
            <p>{language === 'Hebrew' ? 'מה תרצה לעשות?' : 'What would you like to do?'}</p>
            <div className="decision-buttons">
              <button onClick={() => onDecision('continue')}>
                {language === 'Hebrew' ? 'המשך צפייה' : 'Continue Watching'}
              </button>
              <button onClick={() => onDecision('rewind')}>
                {language === 'Hebrew' ? 'חזור אחורה' : 'Rewind'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}