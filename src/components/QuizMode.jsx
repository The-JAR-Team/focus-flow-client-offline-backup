import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/QuizMode.css';

function QuizMode({ video, questions }) {
  const navigate = useNavigate();
  const [showQuestionList, setShowQuestionList] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizMode, setQuizMode] = useState('english'); // 'english', 'hebrew', 'random'

  // Ensure questions is an array and has items
  const questionsList = Array.isArray(questions) ? questions : [];

  const handleStartQuiz = (mode) => {
    setQuizMode(mode);
    setQuizStarted(true);
    setShowQuestionList(false);
    // Randomize questions if mode is random
    if (mode === 'random') {
      questionsList.sort(() => Math.random() - 0.5);
    }
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    // Auto advance to next question after 1.5 seconds
    setTimeout(() => {
      if (currentQuestion < questionsList.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1500);
  };

  const handleBack = () => {
    navigate('/trivia');
  };

  if (questionsList.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <div className="quiz-content">
            <h2>No questions available for this video</h2>
            <button onClick={handleBack} className="back-button">
              Back to Trivia
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showQuestionList) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <div className="question-list-modal">
            <h2>Questions for: {video?.video_name || 'Video'}</h2>
            <div className="mode-buttons">
              <button onClick={() => handleStartQuiz('english')}>English Mode</button>
              <button onClick={() => handleStartQuiz('hebrew')}>Hebrew Mode</button>
              <button onClick={() => handleStartQuiz('random')}>Random Mode</button>
            </div>
            <button onClick={handleBack} className="back-button">
              Back to Trivia
            </button>
            <div className="questions-list">
              {questionsList.map((q, index) => (
                <div key={index} className="question-item">
                  <p><strong>Q{index + 1}:</strong> {q.question}</p>
                  <p><strong>Answers:</strong></p>
                  <ul>
                    {q.answers.map((answer, i) => (
                      <li key={i} style={{ color: answer === q.correct_answer ? '#4CAF50' : 'inherit' }}>
                        {answer}
                      </li>
                    ))}
                  </ul>
                  <p><strong>Difficulty:</strong> {q.difficulty}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizStarted) {
    const question = questionsList[currentQuestion];
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <div className="quiz-content">
            <h3>Question {currentQuestion + 1} of {questionsList.length}</h3>
            <p className="question-text">{question.question}</p>
            <div className="answers-grid">
              {question.answers.map((answer, index) => (
                <button
                  key={index}
                  className={`answer-button ${
                    selectedAnswer === answer 
                      ? answer === question.correct_answer 
                        ? 'correct' 
                        : 'incorrect'
                      : ''
                  }`}
                  onClick={() => handleAnswerSelect(answer)}
                  disabled={showFeedback}
                >
                  {answer}
                </button>
              ))}
            </div>
            {showFeedback && (
              <div className={`feedback ${
                selectedAnswer === question.correct_answer ? 'correct' : 'incorrect'
              }`}>
                {selectedAnswer === question.correct_answer ? 'Correct!' : 'Incorrect!'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default QuizMode;
