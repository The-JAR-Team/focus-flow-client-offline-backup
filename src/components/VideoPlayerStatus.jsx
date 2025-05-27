import React, { useState } from 'react';

function VideoPlayerStatus({
  mode,
  pauseStatus,
  noClientPause,
  faceMeshStatus,
  currentGaze,
  lastModelResult,
  sessionStatus,
  faceMeshError,
  showRetryButton,
  handleFaceMeshRetry,
  bufferFrames,
  REQUIRED_FRAMES,
  requestsSent,
  handleNoClientPauseToggle,
  sendIntervalSeconds,
  handleIntervalChange,
}) {
  const [showStatusInfo, setShowStatusInfo] = useState(false);

  // Helper function to get the engagement score from model result
  const getEngagementScore = (result) => {
    if (result === null || result === undefined) return 'N/A';
    
    // Handle new object format
    if (typeof result === 'object' && result.engagement_score !== undefined) {
      return result.engagement_score.toFixed(3);
    }
    
    // Handle old numeric format
    if (typeof result === 'number') {
      return result.toFixed(3);
    }
    
    return 'N/A';
  };

  // Helper function to get processing mode
  const getProcessingMode = (result) => {
    if (result && typeof result === 'object' && result.processing_mode) {
      // VideoPlayer only uses local ONNX processing
      if (result.processing_mode === 'local_onnx' || result.processing_mode === 'video_player_onnx') {
        return '🧠 Local ONNX';
      }
      return '🌐 Server';
    }
    return '';
  };

  return (
    <>
      <button 
        className="status-toggle-button" 
        onClick={() => setShowStatusInfo(!showStatusInfo)}
        style={{ 
          margin: '10px 0', 
          padding: '5px 10px', 
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        {showStatusInfo ? '📊 Hide Status' : '📊 Show Status'}
      </button>
      {showStatusInfo && (
        <div className="status-info">
          <p>Mode: {mode}</p>
          <p>Status: {pauseStatus}</p>
          <p>FaceMesh: {noClientPause ? 'Server Logic' : faceMeshStatus}</p>
          {!noClientPause && <p>Current Gaze: {currentGaze || 'N/A'}</p>}
          <p>Model Result: <span>{getEngagementScore(lastModelResult)}</span> {getProcessingMode(lastModelResult)}</p>
          {/* Session Status */}
          {sessionStatus && (
            <div className="session-status">
              <p>Session: {sessionStatus.hasActiveSession ? 
                `🎫 Active (Main: ${sessionStatus.mainTicket})` : 
                '❌ No Session'}</p>
              {sessionStatus.hasActiveSession && (
                sessionStatus.isSubTicketLoading ? (
                  <p>Sub Ticket: ⏳ Loading...</p>
                ) : sessionStatus.subTicket ? (
                  <p>Sub Ticket: {sessionStatus.subTicket}</p>
                ) : null
              )}
              {sessionStatus.hasActiveSession && (
                <>
                  <p>Video: {sessionStatus.videoId || 'N/A'}</p>
                  <p>Batch: {sessionStatus.batchSize} items | Duration: {Math.round(sessionStatus.sessionDuration / 1000)}s</p>
                  <p>Auto-batch: {sessionStatus.batchIntervalActive ? '✅ Active' : '❌ Inactive'}</p>
                </>
              )}
            </div>
          )}

          {/* Display FaceMesh error message */}
          {faceMeshError && (
            <div className="facemesh-error">
              <span className="error-icon">⚠️</span>
              FaceMesh Error - Please refresh the page or click retry below
              {showRetryButton && (
                <button className="retry-button" onClick={handleFaceMeshRetry}>
                  Retry FaceMesh
                </button>
              )}
            </div>
          )}
          {/* Buffer and Requests info - shown in both modes */}
          <div className="buffer-status">
            <p>Buffer Frames: <span className="buffer-count">{bufferFrames}/{REQUIRED_FRAMES}</span></p>
            <div className="buffer-progress">
              <div 
                className="buffer-bar" 
                style={{ width: `${(bufferFrames / REQUIRED_FRAMES) * 100}%` }}
              ></div>
            </div>
          </div>
          {/* Show requests info in both client and server modes */}
          <div className="requests-count">
            <p>Requests Sent: <span>{requestsSent}</span></p>
          </div>
          
          <button 
            className={`control-button ${noClientPause ? 'active' : ''}`}
            onClick={handleNoClientPauseToggle}
          >
            {noClientPause ? '🤖 Server Control' : '👁️ Client Control'}
          </button>
          <div style={{ margin: '15px 0' }}>
            <label>Send Interval to ONNX: {sendIntervalSeconds}s</label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={sendIntervalSeconds}
              onChange={(e) => handleIntervalChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default VideoPlayerStatus;