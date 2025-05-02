import { fetchTranscriptQuestions } from './videos';
import { parseTimeToSeconds, shuffleAnswers } from './questionLogic';

// Question fetching with retry logic
export const fetchQuestionsWithRetry = async (
  videoId, 
  language, 
  statusSetter, 
  loadingSetter, 
  questionsSetter,
  setRetryCount,
  maxRetries = 15
) => {
  const retryCountKey = language.toLowerCase();
  
  loadingSetter(true);
  statusSetter(`Starting ${language} question generation...`);
  
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        setRetryCount(prev => ({ ...prev, [retryCountKey]: attempt }));
      }
      
      const data = await fetchTranscriptQuestions(videoId, language);
      
      // Check for transcript not available error
      if (data.status === 'failed' && 
          data.reason && 
          data.reason.includes('Could not retrieve a transcript')) {
        statusSetter(`No ${language} subtitles`);
        loadingSetter(false);
        return [];
      }
      
      // Check for pending status
      if (data.status === 'pending' || data.reason === 'Generation already in progress by another request.') {
        statusSetter(`Building questions... (${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds before retrying
        continue;
      }
      
      // Extract questions from response
      const questionsArray = [
        ...(data.video_questions?.questions || []),
        ...(data.generic_questions?.questions || []),
        ...(data.subject_questions?.questions || [])
      ];
      
      if (questionsArray.length > 0) {
        const sortedQuestions = sortQuestionsByTime(questionsArray);
        
        questionsSetter(sortedQuestions);
        statusSetter(null);
        
        loadingSetter(false);
        return sortedQuestions;
      } else {
        statusSetter(`No questions available`);
        loadingSetter(false);
        return [];
      }
    }
    
    // If we've exhausted all retries
    statusSetter(`Timed out waiting for questions`);
    loadingSetter(false);
    return [];
    
  } catch (err) {
    console.error(`Error fetching ${language} questions:`, err);
    statusSetter(`Error: ${err.message}`);
    loadingSetter(false);
    return [];
  }
};

// Helper function to sort questions by time
export const sortQuestionsByTime = (questions) => {
  return questions.sort((a, b) => {
    return (parseTimeToSeconds(a.question_origin) || 0) - (parseTimeToSeconds(b.question_origin) || 0);
  });
};

// Question selection based on current video time and language
export const selectQuestionForCurrentTime = (
  currentVideoTime,
  questions,
  answeredQIDs,
  selectedLanguage
) => {
  const availableQuestions = getAvailableQuestionsForTime(
    currentVideoTime,
    questions,
    answeredQIDs
  );
  
  if (availableQuestions.length === 0) {
    console.log('No questions available for this segment');
    return null;
  }

  const nextQuestion = selectNextQuestion(availableQuestions);
  if (nextQuestion) {
    return {
      q_id: nextQuestion.q_id,
      text: nextQuestion.question,
      answers: shuffleAnswers(nextQuestion, selectedLanguage),
      originalTime: parseTimeToSeconds(nextQuestion.question_origin),
      endTime: parseTimeToSeconds(nextQuestion.question_explanation_end) 
    };
  }
  
  return null;
};

// Helper function to get available questions for current time
export const getAvailableQuestionsForTime = (currentTime, allQuestions, answeredQIDs) => {
  if (!allQuestions || !Array.isArray(allQuestions)) return [];
  
  const timeWindowStart = Math.max(0, currentTime - 300); // 5 minutes back
  const timeWindowEnd = currentTime + 60; // 1 minute ahead
  
  return allQuestions.filter(q => {
    const questionTime = parseTimeToSeconds(q.question_origin);
    return (
      !answeredQIDs.includes(q.q_id) && // Not already answered
      questionTime >= timeWindowStart && 
      questionTime <= timeWindowEnd
    );
  });
};

// Select the next question to ask
export const selectNextQuestion = (availableQuestions) => {
  if (!availableQuestions || availableQuestions.length === 0) return null;
  
  // For now, just return the first available question
  // Could be extended with more sophisticated selection logic
  return availableQuestions[0];
};
