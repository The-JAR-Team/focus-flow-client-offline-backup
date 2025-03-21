// services/videoLogic.js

export const estimateGaze = (landmarks) => {
    const leftEye = {
      outer: landmarks[33],
      inner: landmarks[133],
      center: landmarks[468],
    };
    const rightEye = {
      outer: landmarks[362],
      inner: landmarks[263],
      center: landmarks[473],
    };
  
    const leftGazeRatio = (leftEye.center.x - leftEye.outer.x) / (leftEye.inner.x - leftEye.outer.x);
    const rightGazeRatio = (rightEye.center.x - rightEye.outer.x) / (rightEye.inner.x - rightEye.outer.x);
  
    const avgGazeRatio = (leftGazeRatio + rightGazeRatio) / 2;
    if (avgGazeRatio < 0.42) return 'Looking left';
    if (avgGazeRatio > 0.58) return 'Looking right';
    return 'Looking center';
  };
  