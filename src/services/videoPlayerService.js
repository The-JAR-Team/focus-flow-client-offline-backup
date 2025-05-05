import { toast } from 'react-toastify';
import {
    fetchTranscriptQuestions,
    fetchWatchItemResults
  } from './videos';

  // --- Functions moved from questionLogic.js ---

  export const parseTimeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0; // Basic validation
    const parts = timeStr.split(':').map(Number);
    if (parts.some(isNaN)) return 0; // Check if parsing resulted in NaN

    if (parts.length === 3) {
      // Handle HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return (hours * 3600) + (minutes * 60) + seconds;
    } else if (parts.length === 2) {
      // Handle MM:SS format
      const [minutes, seconds] = parts;
      return (minutes * 60) + seconds;
    } else if (parts.length === 1) {
        // Handle seconds only format (S or SS)
        return parts[0];
    }
    return 0; // Default case or invalid format
  };

  export const getAvailableQuestions = (currentTime, questions, answeredQIDs) => {
    if (!questions || !Array.isArray(questions)) return [];

    // Filter out answered questions and find the latest one whose start time is before or at the current time
    const available = questions
      .filter(q => !answeredQIDs.includes(q.q_id))
      .map(q => ({ ...q, timeInSeconds: parseTimeToSeconds(q.question_origin) }))
      .filter(q => q.timeInSeconds <= currentTime) // Only consider questions up to the current time
      .sort((a, b) => b.timeInSeconds - a.timeInSeconds); // Sort descending by time

    // Return the most recent available question (first in the sorted list)
    return available.length > 0 ? [available[0]] : [];
  };

  export const selectNextQuestion = (availableQuestions) => {
    // Since getAvailableQuestions now returns at most one question (the most recent one)
    // we just return that question if it exists.
    if (availableQuestions.length === 0) return null;
    return availableQuestions[0];
    // Old random logic: return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  };

  export const shuffleAnswers = (question, language = 'Hebrew') => {
    if (!question) return []; // Handle null question case
    const answers = [
      { key: 'answer1', text: question.answer1 },
      { key: 'answer2', text: question.answer2 },
      { key: 'answer3', text: question.answer3 },
      { key: 'answer4', text: question.answer4 },
    ].filter(a => a.text); // Filter out potential null/empty answers

    // Add "don't know" option
    answers.push({ key: 'dontknow', text: language === 'Hebrew' ? 'לא יודע/ת' : "I don't know" });

    // Shuffle only the actual answers (excluding "don't know" for now)
    const regularAnswers = answers.slice(0, -1);
    for (let i = regularAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regularAnswers[i], regularAnswers[j]] = [regularAnswers[j], regularAnswers[i]];
    }

    // Return shuffled regular answers followed by "don't know"
    return [...regularAnswers, answers[answers.length - 1]];
  };

  // --- End of moved functions ---

  // Function to fetch questions with retry logic
  export const fetchQuestionsWithRetry = async (
    videoId,
    language,
    statusSetter,
    loadingSetter,
    questionsSetter,
    selectedLanguage,
    questionsRef,
    setQuestions,
    abortSignal // Add abort signal parameter
  ) => {
    try {
      loadingSetter(true);
      
      const data = await fetchTranscriptQuestions(videoId, language, abortSignal);
      
      // Handle cancelled request
      if (data.status === 'cancelled') {
        console.log(`⚠️ ${language} question fetch was cancelled`);
        return { success: false, pending: false, cancelled: true, data: [] };
      }
      
      console.log(`📊 ${language} questions status:`, data?.status || 'unknown');

      // Check for transcript not available error
      if (data.status === 'failed' &&
          data.reason &&
          data.reason.includes('Could not retrieve a transcript')) {
        statusSetter(`No ${language} subtitles`);
        loadingSetter(false);
        return { success: false, pending: false, data: [] };
      }

      // Check for pending status
      if (data.status === 'pending' || data.reason === 'Generation already in progress by another request.') {
        statusSetter(`Building questions...`);
        loadingSetter(false);
        return { success: false, pending: true, data: [] };
      }

      // Process questions if available
      const questionsArray = [
        ...(data.video_questions?.questions || []),
        ...(data.generic_questions?.questions || []),
        ...(data.subject_questions?.questions || [])
      ];

      if (questionsArray.length > 0) {
        console.log(`✅ Received ${questionsArray.length} ${language} questions`);
        const sortedQuestions = questionsArray.sort((a, b) => {
          return (parseTimeToSeconds(a.question_origin) || 0) - (parseTimeToSeconds(b.question_origin) || 0);
        });

        questionsSetter(sortedQuestions); // Set specific language questions
        statusSetter(null);

        // If this is the current language, update the main questions state too
        if (selectedLanguage === language) {
          questionsRef.current = sortedQuestions;
          setQuestions(sortedQuestions);
        }
        
        loadingSetter(false);
        return { success: true, pending: false, data: sortedQuestions };
      } 
      
      // No questions available
      statusSetter(`No questions available`);
      loadingSetter(false);
      return { success: false, pending: false, data: [] };
    } catch (err) {
      console.error(`Error fetching ${language} questions:`, err);
      statusSetter(`Error: ${err.message}`);
      loadingSetter(false);
      return { success: false, pending: false, data: [] };
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
    setResultsChartData,
    videoDuration
  ) => {
    // Toggle visibility if chart is already shown
    if (showResultsChart) {
      setShowResultsChart(false);
    }

    try {
      const data = await fetchWatchItemResults(videoId);
      const resultsArray = data[Object.keys(data)[0]];
      console.debug('plot results raw data:', resultsArray);

      if (resultsArray && Array.isArray(resultsArray) && resultsArray.length > 0) {
        const resultsByDate = resultsArray.sort((a, b) => Date(a.timestamp) - Date(b.timestamp));

        // Group by timestamp proximity (5-minute intervals)
        const sessionGroups = [];
        let currentGroup = [resultsByDate[0]];

        const timeIntervalValue = 300; // 5 minutes

        for (let i = 1; i < resultsByDate.length; i++) {
          const currentTime = new Date(resultsByDate[i].timestamp);
          const prevTime = new Date(currentGroup[currentGroup.length - 1].timestamp);

          // Calculate time difference in minutes
          const timeDiffMinutes = (currentTime - prevTime) / (1000);

          if (timeDiffMinutes <= timeIntervalValue) {
            currentGroup.push(resultsByDate[i]);
          } else {
            sessionGroups.push(currentGroup);
            currentGroup = [resultsByDate[i]];
          }
        }

        // Add the last group
        if (currentGroup.length > 0) {
          sessionGroups.push(currentGroup);
        }

        console.log(`Found ${sessionGroups.length} distinct viewing sessions`);
        console.log(sessionGroups);

        // Choose the largest session for plotting
        sessionGroups.sort((a, b) => b.length - a.length); // Sort by size
        const selectedSession = sessionGroups[0];
        console.log('Selected session for plotting:', selectedSession);

        
        const sortedData = selectedSession.sort((a, b) => a.video_time - b.video_time);

        // Extract video duration in seconds
        const [hours, minutes, seconds] = videoDuration.split(':').map(Number);
        const totalDurationSeconds = hours * 3600 + minutes * 60 + seconds;
        const timeInterval = 5; 
        const completeTimeRange = [];
        for (let time = 0; time <= totalDurationSeconds; time += timeInterval) {
          completeTimeRange.push(time);
        }

        const chartData = completeTimeRange.map(timePoint => {
          // Find the closest data point (if any)
          const closestData = sortedData.find(item =>
            Math.abs(item.video_time - timePoint) < timeInterval /2
          );

          // Format time for label
          const minutes = Math.floor(timePoint / 60);
          const secs = Math.round(timePoint % 60);
          const timeLabel = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;

          return {
            label: timeLabel,
            value: closestData ? closestData.result * 100 : 0 // Use 0 or null for no data
          };
        });

        setResultsChartData({
          labels: chartData.map(item => item.label),
          datasets: [
            {
              label: 'Focus over Time',
              data: chartData.map(item => item.value),
              backgroundColor: 'rgb(8, 83, 181)',
              borderColor: 'rgb(8, 83, 181)',
              borderWidth: 1,
            },
          ],
        });

        setShowResultsChart(true); // Show the chart
        // console.log('Results chart data updated:', { labels, values });
      } else {
        console.error('No data available for plotting results or data is not in the expected array format.');
        toast.error('No data available for plotting results.');
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