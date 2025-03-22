// components/QuestionModals.jsx
import { useEffect, useState } from 'react';

export function QuestionModal({ question, onAnswer }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h3>Question:</h3>
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

export function DecisionModal({ isCorrect, onDecision }) {
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
      <div className="modal-content">
        <h3>{isCorrect ? 'Correct!' : 'Incorrect.'}</h3>
        {isCorrect ? (
          <p>Continuing in {timer}...</p>
        ) : (
          <>
            <p>What would you like to do?</p>
            <div className="decision-buttons">
              <button onClick={() => onDecision('continue')}>Continue Watching</button>
              <button onClick={() => onDecision('rewind')}>Rewind</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}