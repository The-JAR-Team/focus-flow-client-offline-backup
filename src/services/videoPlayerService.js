import {
    fetchTranscriptQuestions,
    fetchWatchItemResults
  } from './videos';
  import { parseTimeToSeconds } from './questionLogic';
  
  // Function to fetch questions with retry logic
  export const fetchQuestionsWithRetry = async (
    videoId,
    language,
    maxRetries = 15,
    statusSetter,
    loadingSetter,
    questionsSetter,
    retryCountSetter,
    selectedLanguage,
    questionsRef,
    setQuestions // Add setQuestions callback
  ) => {
    const retryCountKey = language.toLowerCase();
  
    loadingSetter(true);
    statusSetter(`Starting ${language} question generation...`);
  
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          retryCountSetter(prev => ({ ...prev, [retryCountKey]: attempt }));
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
          const sortedQuestions = questionsArray.sort((a, b) => {
            return (parseTimeToSeconds(a.question_origin) || 0) - (parseTimeToSeconds(b.question_origin) || 0);
          });
  
          questionsSetter(sortedQuestions); // Set specific language questions (e.g., setHebrewQuestions)
          statusSetter(null);
  
          // If this is the current language, update the main questions state too
          if (selectedLanguage === language) {
            questionsRef.current = sortedQuestions;
            setQuestions(sortedQuestions); // Update the main 'questions' state
          }
  
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
  
  // Function to reset answered questions
  export const handleResetAnsweredQuestions = (videoId, setAnsweredQIDs) => {
    setAnsweredQIDs([]);
    localStorage.removeItem(`answeredQuestions_${videoId}`);
    console.log(`debugg: Answered questions reset for video ${videoId}`);
  };
  
  // Function to plot results
  export const handlePlotResults = async (
    videoId,
    showResultsChart,
    setShowResultsChart,
    setResultsChartData
  ) => {
    // Toggle visibility if chart is already shown
    if (showResultsChart) {
      setShowResultsChart(false);
      return; // Exit early if toggling off
    }
  
    try {
      const data = await fetchWatchItemResults(videoId);
      const resultsArray = data[Object.keys(data)[0]];
      console.debug('plot results raw data:', resultsArray);
  
      if (resultsArray && Array.isArray(resultsArray) && resultsArray.length > 0) {
        const sortedData = resultsArray.sort((a, b) => a.video_time - b.video_time);
  
        const labels = sortedData.map(item => (item.video_time / 60).toFixed(1)); // Use video_time for x-axis, rounded
        const values = sortedData.map(item => item.result * 100); // Use result for y-axis
  
        setResultsChartData({
          labels,
          datasets: [
            {
              label: 'Focus over Time',
              data: values,
              backgroundColor: 'rgba(153, 102, 255, 0.6)', // Different color
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1,
            },
          ],
        });
        setShowResultsChart(true); // Show the chart
        console.log('Results chart data updated:', { labels, values });
      } else {
        console.error('No data available for plotting results or data is not in the expected array format.');
        setResultsChartData({ labels: [], datasets: [] });
        setShowResultsChart(false); // Hide the chart if no data
      }
    } catch (error) {
      console.error('Error fetching or processing watch item results:', error);
      setResultsChartData({ labels: [], datasets: [] });
      setShowResultsChart(false); // Hide the chart on error
    }
  };
  
  // Function to handle language change
  export const handleLanguageChange = (
    language,
    setSelectedLanguage,
    hebrewQuestions,
    englishQuestions,
    questionsRef,
    setQuestions
  ) => {
    setSelectedLanguage(language);
    if (language === 'Hebrew') {
      questionsRef.current = hebrewQuestions;
      setQuestions(hebrewQuestions);
    } else {
      questionsRef.current = englishQuestions;
      setQuestions(englishQuestions);
    }
  };