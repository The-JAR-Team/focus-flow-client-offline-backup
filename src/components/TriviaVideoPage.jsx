import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import QuizMode from './QuizMode';
import Navbar from './Navbar';
import Spinner from './Spinner';
import { getVideoQuestions } from '../services/triviaService';
import { fetchTranscriptQuestions } from '../services/videos';
import '../styles/TriviaVideoPage.css';

function TriviaVideoPage() {
  const { videoId } = useParams();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [hebrewQuestions, setHebrewQuestions] = useState([]);
  const [englishQuestions, setEnglishQuestions] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('Hebrew');
  const [showLanguageSelection, setShowLanguageSelection] = useState(true);
  const [quizMode, setQuizMode] = useState('chronological'); // or 'random'
  const [isQuestionsHidden, setIsQuestionsHidden] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [hebrewStatus, setHebrewStatus] = useState(null);
  const [englishStatus, setEnglishStatus] = useState(null);
  const [retryCount, setRetryCount] = useState({ hebrew: 0, english: 0 });

  const handleReset = () => {
    setShowLanguageSelection(true);
    setQuestions([]);
    setSelectedLanguage('Hebrew');
    setQuizMode('chronological');
  };

  const fetchQuestionsWithRetry = async (externalId, language, maxRetries = 30) => {
    const statusSetter = language === 'Hebrew' ? setHebrewStatus : setEnglishStatus;
    const questionsSetter = language === 'Hebrew' ? setHebrewQuestions : setEnglishQuestions;
    const retryCountKey = language.toLowerCase();
    
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          setRetryCount(prev => ({ ...prev, [retryCountKey]: attempt }));
        }
        
        const data = await fetchTranscriptQuestions(externalId, language);
        
        if (data.status === 'pending' || data.reason === 'Generation already in progress by another request.') {
          statusSetter(`Building ${language} questions... (Check #${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // If we got here, we either have questions or a definitive error
        const formattedQuestions = formatQuestions(data);
        questionsSetter(formattedQuestions);
        
        if (formattedQuestions.length === 0) {
          statusSetter(`No questions available for ${language}`);
        } else {
          statusSetter(null);
        }
        
        return data;
      }
      
      // If we exhausted all retries
      statusSetter(`Timed out waiting for ${language} questions generation.`);
      return null;
      
    } catch (err) {
      console.error(`Error fetching ${language} questions:`, err);
      statusSetter(`Error: ${err.message}`);
      return null;
    }
  };

  const formatQuestions = (data) => {
    // Check if data exists and has any type of questions
    const questionsData = data?.video_questions?.questions || 
                        data?.subject_questions?.questions || 
                        data?.generic_questions?.questions || [];
    
    if (!questionsData.length) return [];

    return questionsData.map(q => ({
      question: q.question || '',
      answers: [
        q.answer1 || '', 
        q.answer2 || '', 
        q.answer3 || '', 
        q.answer4 || ''
      ].filter(Boolean), // Remove empty answers
      correct_answer: q.answer1 || '',
      difficulty: q.difficulty || 1,
      explanation: q.explanation_snippet || ''
    }));
  };

  useEffect(() => {
    const fetchVideoAndQuestions = async () => {
      try {
        const allVideos = JSON.parse(localStorage.getItem('triviaVideos') || '[]');
        console.log('Searching for video:', videoId);
        console.log('Available videos:', allVideos);
        
        const videoData = allVideos.find(v => 
          String(v.video_id) === String(videoId) || 
          String(v.external_id) === String(videoId)
        );
        
        if (!videoData) {
          throw new Error('Video not found in storage');
        }

        setVideo(videoData);
        setLoadingQuestions(true);
        setHebrewStatus('Starting question generation...');
        setEnglishStatus('Starting question generation...');
        
        // Use external_id for fetching questions with retry
        await Promise.all([
          fetchQuestionsWithRetry(videoData.external_id, 'Hebrew'),
          fetchQuestionsWithRetry(videoData.external_id, 'English')
        ]);

      } catch (err) {
        console.error('Error details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingQuestions(false);
      }
    };

    fetchVideoAndQuestions();
  }, [videoId]);

  const handleStartQuiz = () => {
    const selectedQuestions = selectedLanguage === 'Hebrew' ? hebrewQuestions : englishQuestions;
    const finalQuestions = quizMode === 'random' 
      ? [...selectedQuestions].sort(() => Math.random() - 0.5)
      : selectedQuestions;
    
    setQuestions(finalQuestions);
    setShowLanguageSelection(false);
  };

  const renderStartQuizButton = () => {
    const currentQuestions = selectedLanguage === 'Hebrew' ? hebrewQuestions : englishQuestions;
    const currentStatus = selectedLanguage === 'Hebrew' ? hebrewStatus : englishStatus;
    const currentRetry = selectedLanguage === 'Hebrew' ? retryCount.hebrew : retryCount.english;
    
    return (
      <button 
        className={`start-quiz-btn ${loadingQuestions || currentStatus ? 'loading' : ''}`}
        onClick={handleStartQuiz}
        disabled={currentQuestions.length === 0 || loadingQuestions || currentStatus}
      >
        {currentStatus ? (
          <>
            <span className="spinner"></span>
            {currentStatus}
          </>
        ) : loadingQuestions ? (
          <>
            <span className="spinner"></span>
            Loading Questions...
          </>
        ) : (
          <>
            <span className="btn-icon">▶️</span>
            Start Quiz
          </>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <div className="loading-status-container">
            <Spinner size="large" message="Loading quiz..." />
            
            {(hebrewStatus || englishStatus) && (
              <div className="question-generation-status">
                <h3>Building Questions</h3>
                {hebrewStatus && (
                  <div className="language-status">
                    <div className="status-header">
                      <span className="spinner small"></span>
                      <strong>Hebrew: </strong>
                    </div>
                    <div className="status-detail">
                      Server check #{retryCount.hebrew}: {hebrewStatus}
                    </div>
                  </div>
                )}
                
                {englishStatus && (
                  <div className="language-status">
                    <div className="status-header">
                      <span className="spinner small"></span>
                      <strong>English: </strong>
                    </div>
                    <div className="status-detail">
                      Server check #{retryCount.english}: {englishStatus}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <div className="quiz-content">
            <h2>Error loading quiz</h2>
            <p>{error || 'Video not found'}</p>
            <Link to="/trivia" className="back-button">
              Back to Trivia
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showLanguageSelection && !loading && !error) {
    const currentQuestions = selectedLanguage === 'Hebrew' ? hebrewQuestions : englishQuestions;
    const currentStatus = selectedLanguage === 'Hebrew' ? hebrewStatus : englishStatus;
    const currentRetry = selectedLanguage === 'Hebrew' ? retryCount.hebrew : retryCount.english;
    
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <div className="language-selection">
            <h2>Quiz for: {video?.video_name}</h2>
            
            <div className="control-panel">
              <div className="language-options">
                <button 
                  className={`lang-btn ${selectedLanguage === 'Hebrew' ? 'active' : ''} ${hebrewQuestions.length === 0 ? 'disabled' : ''}`}
                  onClick={() => setSelectedLanguage('Hebrew')}
                  disabled={hebrewQuestions.length === 0 && !hebrewStatus}
                >
                  Hebrew {hebrewQuestions.length === 0 && !hebrewStatus && '❌'}
                  {hebrewStatus && <span className="status-icon">⏳</span>}
                </button>
                <button 
                  className={`lang-btn ${selectedLanguage === 'English' ? 'active' : ''} ${englishQuestions.length === 0 ? 'disabled' : ''}`}
                  onClick={() => setSelectedLanguage('English')}
                  disabled={englishQuestions.length === 0 && !englishStatus}
                >
                  English {englishQuestions.length === 0 && !englishStatus && '❌'}
                  {englishStatus && <span className="status-icon">⏳</span>}
                </button>
              </div>

              <div className="mode-selection">
                <button 
                  className={`mode-btn ${quizMode === 'chronological' ? 'active' : ''}`}
                  onClick={() => setQuizMode('chronological')}
                >
                  <span className="mode-icon">🔄</span>
                  Chronological
                </button>
                <button 
                  className={`mode-btn ${quizMode === 'random' ? 'active' : ''}`}
                  onClick={() => setQuizMode('random')}
                >
                  <span className="mode-icon">🎲</span>
                  Random
                </button>
              </div>
            </div>

            <div className="action-buttons">
              {renderStartQuizButton()}
              <button 
                className={`toggle-questions-btn ${isQuestionsHidden ? 'questions-hidden' : ''}`}
                onClick={() => setIsQuestionsHidden(!isQuestionsHidden)}
                disabled={currentQuestions.length === 0}
              >
                <span className="btn-icon">{isQuestionsHidden ? '👁️' : '👁️‍🗨️'}</span>
                {isQuestionsHidden ? 'Show Questions' : 'Hide Questions'}
              </button>
            </div>

            {currentStatus && (
              <div className="status-message">
                <span className="spinner small"></span>
                <strong>Building {selectedLanguage} questions</strong>
                <div className="status-detail">
                  Server check #{currentRetry}: {currentStatus}
                </div>
              </div>
            )}

            <div className={`questions-preview ${isQuestionsHidden ? 'blurred' : ''} ${selectedLanguage === 'Hebrew' ? 'rtl' : 'ltr'}`}>
              <h3>Preview Questions ({currentQuestions.length})</h3>
              {currentQuestions.length > 0 ? (
                currentQuestions.map((q, index) => (
                  <div key={index} className="question-card">
                    <div className="question-header">
                      <span className="question-number">Q{index + 1}</span>
                      <span className="question-difficulty">{q.difficulty}</span>
                    </div>
                    <p className="question-text">{q.question}</p>
                    <ul className="answers-list">
                      {q.answers.map((answer, i) => (
                        <li 
                          key={i}
                          className={answer === q.correct_answer ? 'correct-answer' : ''}
                        >
                          {answer}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : !currentStatus ? (
                <div className="no-questions-message">
                  <p>No questions available for this language</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return !showLanguageSelection ? (
    <QuizMode 
      video={video} 
      questions={questions} 
      mode={quizMode} 
      language={selectedLanguage}
      onReset={handleReset}
    /> 
  ) : null;
}

export default TriviaVideoPage;
