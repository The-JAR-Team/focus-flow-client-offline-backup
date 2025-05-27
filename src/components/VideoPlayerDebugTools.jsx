import React from 'react';

function VideoPlayerDebugTools({
  sensitivity,
  setSensitivity,
  handleManualTrigger,
  handleResetAnsweredQuestions,
  resetSessionAndGetNewTicket,
  lectureVideoId,
  handlePlotResults,
  showResultsChart,
  handleToggleTimeline,
  showTimeline,
  toggleTimelineType,
  timelineType,
  handleAllPlotResults,
  showAllResultsChart,
}) {
  return (
    <div className="debug-tools">
      <h3>Debug Tools</h3>
      <div className="sensitivity-control">
        <label> Engagement Sensitivity: {sensitivity}</label>
        <input
          type="range"
          min="0"
          max="10"
          value={sensitivity}
          onChange={e => setSensitivity(+e.target.value)}
        />
      </div>
      <button 
        className="debug-button trigger"
        onClick={handleManualTrigger}
      >
        🎯 Trigger Question
      </button>
      <button 
        className="debug-button reset-answers"
        onClick={handleResetAnsweredQuestions}
      >
        🔄 Reset Answered Qs
      </button>
      <button 
        className="debug-button reset-ticket"
        onClick={async () => {
          try {
            const newTicket = await resetSessionAndGetNewTicket(lectureVideoId);
            if (newTicket) {
              console.log(`✅ New main ticket obtained: ${newTicket}`);
            } else {
              console.error('❌ Failed to get new main ticket');
            }
          } catch (error) {
            console.error('❌ Error resetting session:', error);
          }
        }}
      >
        🎫 Reset Main Ticket
      </button>
      <button
        className="debug-button"
        onClick={handlePlotResults}
      >
        {showResultsChart ? 'Hide Results' : 'Plot Results'}
      </button>
      <button
        className="debug-button"
        onClick={handleToggleTimeline}
      >
        {showTimeline ? 'Hide' : 'Show'} Timeline
      </button>
      <button
        className="debug-button"
        onClick={toggleTimelineType}
      >
        {timelineType === 'question' ? 'Switch to Summary' : 'Switch to Questions'}
      </button>
      <button
        className="debug-button"
        onClick={handleAllPlotResults}
      >
        {showAllResultsChart ? 'Hide all watcher\'s results' : 'Plot all watchers\' results'}
      </button>
    </div>
  );
}

export default VideoPlayerDebugTools;
