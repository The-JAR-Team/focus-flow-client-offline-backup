import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import QuizMode from './QuizMode';
import Navbar from './Navbar';
import Spinner from './Spinner';
import { getVideoQuestions } from '../services/triviaService';
import { fetchTranscriptQuestions } from '../services/videos';
import '../styles/TriviaVideoPage.css';

function TriviaVideoPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [hebrewQuestions, setHebrewQuestions] = useState([]);
  const [englishQuestions, setEnglishQuestions] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showLanguageSelection, setShowLanguageSelection] = useState(true);
  const [quizMode, setQuizMode] = useState('chronological'); // or 'random'
  const [isQuestionsHidden, setIsQuestionsHidden] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [hebrewStatus, setHebrewStatus] = useState(null);
  const [englishStatus, setEnglishStatus] = useState(null);
  const [retryCount, setRetryCount] = useState({ hebrew: 0, english: 0 });
  const [playlistOptions, setPlaylistOptions] = useState([]);

  const hebrewAbortController = useRef(new AbortController());
  const englishAbortController = useRef(new AbortController());
  const timeoutRefs = useRef([]);

  const cleanupRequests = () => {
    console.log('🧹 Cleaning up TriviaVideoPage requests and timeouts');
    try {
      hebrewAbortController.current.abort();
      englishAbortController.current.abort();
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  };

  useEffect(() => {
    return cleanupRequests;
  }, []);

  const handleReset = () => {
    setShowLanguageSelection(true);
    setQuestions([]);
    setSelectedLanguage('English');
    setQuizMode('chronological');
  };
  
  const navigateToVideoPlayer = (playlistId) => {
    if (video && video.external_id) {
      navigate(`/playlist/${playlistId}/video/${video.external_id}`);
    } else {
      console.error('Cannot navigate to video player: missing video external ID');
    }
  };

  const fetchQuestionsWithRetry = async (externalId, language, maxRetries = 30) => {
    const statusSetter = language === 'Hebrew' ? setHebrewStatus : setEnglishStatus;
    const questionsSetter = language === 'Hebrew' ? setHebrewQuestions : setEnglishQuestions;
    const retryCountKey = language.toLowerCase();
    const abortController = language === 'Hebrew' ? hebrewAbortController.current : englishAbortController.current;

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (abortController.signal.aborted) {
          console.log(`🛑 ${language} questions fetch aborted`);
          return null;
        }

        if (attempt > 0) {
          setRetryCount(prev => ({ ...prev, [retryCountKey]: attempt }));
        }

        const data = await fetchTranscriptQuestions(externalId, language, abortController);

        if (data.status === 'cancelled') {
          console.log(`⚠️ ${language} question fetch was cancelled`);
          return null;
        }

        if (data.status === 'failed' && 
            data.reason && 
            data.reason.includes('Could not retrieve a transcript')) {
          statusSetter(`No ${language} subtitles available for this video`);
          return null;
        }

        if (data.status === 'pending' || data.reason === 'Generation already in progress by another request.') {
          statusSetter(`Building ${language} questions... (Check #${attempt + 1})`);

          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, 2000);
            timeoutRefs.current.push(timeoutId);

            abortController.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });

          continue;
        }

        const formattedQuestions = formatQuestions(data);
        questionsSetter(formattedQuestions);

        if (formattedQuestions.length === 0) {
          statusSetter(`No questions available`);
        } else {
          statusSetter(null);
        }

        return data;
      }

      statusSetter(`Timed out waiting for ${language} questions generation.`);
      return null;

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`🛑 ${language} question fetch operation aborted`);
        return null;
      }
      console.error(`Error fetching ${language} questions:`, err);
      statusSetter(`Error: ${err.message}`);
      return null;
    }
  };

  const formatQuestions = (data) => {
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
      ].filter(Boolean),
      correct_answer: q.answer1 || '',
      difficulty: q.difficulty || 1,
      explanation: q.explanation_snippet || ''
    }));
  };

  useEffect(() => {
    const fetchVideoAndQuestions = async () => {
      try {
        hebrewAbortController.current = new AbortController();
        englishAbortController.current = new AbortController();

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
        
        // Load playlist options for this video
        try {
          const videoToPlaylistMap = JSON.parse(localStorage.getItem('videoToPlaylistMap') || '{}');
          const externalId = videoData.external_id || videoData.video_id;
          const videoId = videoData.video_id || videoData.external_id;
          
          // Check for playlists containing this video using either external_id or video_id
          const videoPlaylists = videoToPlaylistMap[externalId] || videoToPlaylistMap[videoId] || [];
          
          console.log('Available playlists for this video:', videoPlaylists);
          setPlaylistOptions(videoPlaylists);
        } catch (error) {
          console.error('Error loading playlist options:', error);
        }
        
        setLoadingQuestions(true);
        setHebrewStatus('Starting question generation...');
        setEnglishStatus('Starting question generation...');

        const [hebrewResult, englishResult] = await Promise.all([
          fetchQuestionsWithRetry(videoData.external_id, 'Hebrew'),
          fetchQuestionsWithRetry(videoData.external_id, 'English')
        ]);

        const hebrewFailed = hebrewStatus && hebrewStatus.includes('No Hebrew subtitles available');
        const englishFailed = englishStatus && englishStatus.includes('No English subtitles available');

        if (hebrewFailed && englishFailed) {
          setError('No subtitles available for this video in any language. Cannot generate questions.');
        }

      } catch (err) {
        console.error('Error details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setLoadingQuestions(false);
      }
    };

    fetchVideoAndQuestions();

    return cleanupRequests;
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

    const hebrewNoSubtitles = hebrewStatus && hebrewStatus.includes('No Hebrew subtitles available');
    const englishNoSubtitles = englishStatus && englishStatus.includes('No English subtitles available');

    return (
      <div style={{ padding: '20px' }}>
        <Navbar />        <div className="quiz-container">
          <div className="language-selection">            <div className="trivia-header">
              <h2>Quiz for: {video?.video_name}</h2>
              <Link 
                to="/trivia" 
                className="back-to-trivia"
                onClick={() => {
                  // Store current video ID to scroll to it when returning to the list
                  localStorage.setItem('lastViewedVideoId', videoId);
                }}
              >
                ← Back to Trivia List
              </Link>
            </div>
            
            <div className="control-panel">
              <div className="language-options">
                <button 
                  className={`lang-btn ${selectedLanguage === 'Hebrew' ? 'active' : ''} ${hebrewQuestions.length === 0 ? 'disabled' : ''}`}
                  onClick={() => setSelectedLanguage('Hebrew')}
                  disabled={hebrewQuestions.length === 0}
                >
                  Hebrew {hebrewNoSubtitles ? '❌' : (hebrewQuestions.length === 0 && !hebrewStatus ? '❌' : '')}
                  {hebrewStatus && !hebrewNoSubtitles && <span className="status-icon">⏳</span>}
                </button>
                <button 
                  className={`lang-btn ${selectedLanguage === 'English' ? 'active' : ''} ${englishQuestions.length === 0 ? 'disabled' : ''}`}
                  onClick={() => setSelectedLanguage('English')}
                  disabled={englishQuestions.length === 0}
                >
                  English {englishNoSubtitles ? '❌' : (englishQuestions.length === 0 && !englishStatus ? '❌' : '')}
                  {englishStatus && !englishNoSubtitles && <span className="status-icon">⏳</span>}
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
            </div>            <div className="action-buttons">
              {renderStartQuizButton()}
              <button 
                className={`toggle-questions-btn ${isQuestionsHidden ? 'questions-hidden' : ''}`}
                onClick={() => setIsQuestionsHidden(!isQuestionsHidden)}
                disabled={currentQuestions.length === 0}
              >
                <span className="btn-icon">{isQuestionsHidden ? '👁️' : '👁️‍🗨️'}</span>
                {isQuestionsHidden ? 'Show Questions' : 'Hide Questions'}
              </button>
              <Link to={`/trivia/${videoId}/summary`} className="view-summary-btn">
                <span className="btn-icon">📝</span>
                View Summary
              </Link>
                {/* Watch Video Button with Playlist Selection */}
              {playlistOptions.length > 0 && (
                <div className="watch-video-container">
                  {playlistOptions.length === 1 ? (
                    <button 
                      className="watch-video-btn"
                      onClick={() => navigateToVideoPlayer(playlistOptions[0].playlist_id)}
                    >
                      <span className="btn-icon">📺</span>
                      Watch Video
                    </button>
                  ) : (
                    <div className="dropdown-container">
                      <select 
                        className="playlist-select"
                        defaultValue=""
                      >
                        <option value="" disabled>Select a playlist</option>
                        {playlistOptions.map(playlist => (
                          <option key={playlist.playlist_id} value={playlist.playlist_id}>
                            {playlist.playlist_name}
                          </option>
                        ))}
                      </select>
                      <button 
                        className="watch-video-btn"
                        onClick={() => {
                          const select = document.querySelector('.playlist-select');
                          if (select && select.value) {
                            navigateToVideoPlayer(select.value);
                          } else {
                            alert('Please select a playlist first');
                          }
                        }}
                      >
                        <span className="btn-icon">📺</span>
                        Watch Video
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentStatus && (
              <div className={`status-message ${currentStatus.includes('No') ? 'error-status' : ''}`}>
                {currentStatus.includes('No') ? (
                  <span className="error-icon">⚠️</span>
                ) : (
                  <span className="spinner small"></span>
                )}
                <strong>
                  {currentStatus.includes('No') ? 'Error: ' : `Building ${selectedLanguage} questions`}
                </strong>
                <div className="status-detail">
                  {currentStatus.includes('No') ? currentStatus : `Server check #${currentRetry}: ${currentStatus}`}
                </div>
              </div>
            )}

            {(hebrewNoSubtitles && englishNoSubtitles) && (
              <div className="no-subtitles-warning">
                <p>⚠️ This video doesn't have subtitles in any language. Try another video or add subtitles to this one.</p>
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
