import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import QuizMode from './QuizMode';
import Navbar from './Navbar';
import Spinner from './Spinner';
import { getVideoQuestions } from '../services/triviaService';

function TriviaVideoPage() {
  const { videoId } = useParams();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

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
        
        // Fetch questions using the service
        const questionsData = await getVideoQuestions(videoData.external_id);
        // Extract video_questions array from the response
        const formattedQuestions = questionsData.video_questions.questions.map(q => ({
          question: q.question,
          answers: [q.answer1, q.answer2, q.answer3, q.answer4],
          correct_answer: q.answer1, // Assuming first answer is always correct
          difficulty: q.difficulty
        }));
        
        setQuestions(formattedQuestions);
        console.log('Formatted questions:', formattedQuestions);
      } catch (err) {
        console.error('Error details:', err);
        setError(err.message);
        setQuestions([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndQuestions();
  }, [videoId]);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="quiz-container">
          <Spinner size="large" message="Loading quiz..." />
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

  return <QuizMode video={video} questions={questions} />;
}

export default TriviaVideoPage;
