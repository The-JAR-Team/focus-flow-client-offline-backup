// components/QuestionModals.jsx
import React from 'react';

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
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h3>{isCorrect ? 'Correct!' : 'Incorrect.'}</h3>
        <p>What would you like to do?</p>
        <div className="decision-buttons">
          <button onClick={() => onDecision('continue')}>Continue Watching</button>
          <button onClick={() => onDecision('rewind')}>Rewind</button>
        </div>
      </div>
    </div>
  );
}
