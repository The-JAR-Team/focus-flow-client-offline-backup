import { handleVideoResume, handleVideoPause, fetchWatchItemResults } from './videos';

// Player state constants
export const PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
};

// Initialize video player state and tracking
export const initializeVideoPlayer = (
  playerRef, 
  initialPlaybackTime,
  videoId,
  sendIntervalSeconds,
  setIsPlaying,
  setPauseStatus
) => {
  if (!playerRef.current) return;
  
  if (initialPlaybackTime > 0) {
    console.log(`🔄 Seeking video to ${initialPlaybackTime}s.`);
    playerRef.current.seekTo(initialPlaybackTime, true);
  }
  
  // Start playing and initialize tracking
  playerRef.current.playVideo();
  
  // Small delay to ensure player state is updated
  setTimeout(() => {
    handleVideoResume(
      videoId,
      'basic',
      sendIntervalSeconds,
      () => playerRef.current?.getCurrentTime() || 0
    );
    setIsPlaying(true);
    setPauseStatus('Playing');
  }, 1000);
};

// Handle player state changes
export const handlePlayerStateChange = (
  event,
  playerRef,
  videoId,
  sendIntervalSeconds,
  systemPauseRef,
  setIsPlaying,
  setPauseStatus,
  setUserPaused,
  setIsVideoPaused,
  setVideoPlaying
) => {
  const playerState = event.data;

  switch (playerState) {
    case PLAYER_STATES.PLAYING:
      setIsPlaying(true);
      setPauseStatus('Playing');
      setUserPaused(false);
      setIsVideoPaused(false);
      setVideoPlaying(true);
      handleVideoResume(
        videoId, 
        'basic', 
        sendIntervalSeconds,
        () => playerRef.current?.getCurrentTime() || 0
      );
      break;
    case PLAYER_STATES.PAUSED:
      if (systemPauseRef.current) {
        setPauseStatus('Paused (Not Engaged)');
      } else {
        setPauseStatus('Paused Manually');
        setUserPaused(true);
      }
      setIsPlaying(false);
      setIsVideoPaused(true);
      setVideoPlaying(false);
      handleVideoPause();
      break;
    default:
      break;
  }
};

// Process and format results chart data
export const processResultsChartData = (resultsArray) => {
  if (!resultsArray || !Array.isArray(resultsArray) || resultsArray.length === 0) {
    return { labels: [], datasets: [] };
  }
  
  const sortedData = resultsArray.sort((a, b) => a.video_time - b.video_time);
  const labels = sortedData.map(item => (item.video_time/60).toFixed(1)); // Use video_time for x-axis, rounded
  const values = sortedData.map(item => item.result*100); // Use result for y-axis

  return {
    labels,
    datasets: [
      {
        label: 'Focus over Time',
        data: values,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };
};

// Fetch and process results for plotting
export const fetchAndProcessResults = async (videoId, setResultsChartData, setShowResultsChart) => {
  try {
    const data = await fetchWatchItemResults(videoId);
    const resultsArray = data[Object.keys(data)[0]];
    
    if (resultsArray && Array.isArray(resultsArray) && resultsArray.length > 0) {
      const chartData = processResultsChartData(resultsArray);
      setResultsChartData(chartData);
      setShowResultsChart(true);
      console.log('Results chart data updated:', chartData);
      return true;
    } else {
      console.error('No data available for plotting results or data is not in the expected array format.');
      setResultsChartData({ labels: [], datasets: [] });
      setShowResultsChart(false);
      return false;
    }
  } catch (error) {
    console.error('Error fetching or processing watch item results:', error);
    setResultsChartData({ labels: [], datasets: [] });
    setShowResultsChart(false);
    return false;
  }
};
