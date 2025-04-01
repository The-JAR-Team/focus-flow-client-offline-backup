import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/QuizMode.css';

function QuizMode({ video, questions, mode, language, onReset }) {  // Add onReset prop
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    if (answer === questions[currentQuestion].correct_answer) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setIsComplete(true);
      }
    }, 1500);
  };

  const handleBackToSetup = () => {
    onReset(); // This will reset the parent component state
  };

  if (isComplete) {
    return (
      <>
        <div style={{ padding: '20px' }}>
          <Navbar />
        </div>
        <div className="quiz-complete">
          <div className="quiz-result">
            <h2>Quiz Complete!</h2>
            <div className="score-display">
              <h3>Your Score: {score}/{questions.length}</h3>
              <p>({((score/questions.length) * 100).toFixed(1)}%)</p>
            </div>
            <div className="action-buttons">
              <button onClick={() => {
                setCurrentQuestion(0);
                setScore(0);
                setSelectedAnswer(null);
                setIsComplete(false);
              }}>Try Again</button>
              <button onClick={handleBackToSetup}>Back to Setup</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const currentQ = questions[currentQuestion];
  return (
    <>
      <div style={{ padding: '20px' }}>
        <Navbar />
      </div>
      <div className="quiz-active">
        <div className="quiz-header">
          <button className="back-btn" onClick={handleBackToSetup}>⬅️ Back</button>
          <div className="quiz-info">
            <span>Question {currentQuestion + 1}/{questions.length}</span>
            <span>Score: {score}</span>
            <span>Language: {language}</span>
            <span>Mode: {mode}</span>
          </div>
        </div>
        <div className="question-container">
          <h3 className="question-text">{currentQ.question}</h3>
          <div className="answers-grid">
            {currentQ.answers.map((answer, index) => (
              <button
                key={index}
                className={`answer-btn ${
                  selectedAnswer === answer
                    ? answer === currentQ.correct_answer
                      ? 'correct'
                      : 'incorrect'
                    : ''
                }`}
                onClick={() => !selectedAnswer && handleAnswerSelect(answer)}
                disabled={selectedAnswer !== null}
              >
                {answer}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default QuizMode;
