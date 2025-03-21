import React from 'react';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import '../styles/Dashboard.css';
import EyeDebugger from './EyeDebugger';

import { useEffect, useRef, useState } from 'react';





function Dashboard() {
  // Dummy data for simulation
  const lectureInfo = { videoId: 'U5CsAJqptW8', subject: 'Demo Lecture' };
  const userInfo = { name: 'Test User', profile: 'default' };
  const [eyeDebuggerOn, setEyeDebuggerOn] = useState(false);


  useEffect(() => {

    // wait 5 seconds for ffface mash ing to load
    setTimeout(() => {
      setEyeDebuggerOn(true);
    }, 5000);
    
    

  }, []);

  const isDebugging = false; // set to true if you want to see the debugger

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2>Dashboard</h2>
        <VideoPlayer 
          mode="question"
          sessionPaused={false}
          sessionEnded={false}
          onSessionData={(data) => console.log('Session data:', data)}
          lectureInfo={lectureInfo}
          userInfo={userInfo}
        />
      </div>
      {<EyeDebugger enabled={eyeDebuggerOn} />}
    </div>
  );
}

export default Dashboard;
