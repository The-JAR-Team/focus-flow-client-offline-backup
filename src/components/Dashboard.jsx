import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import VideoPlayer from './VideoPlayer';
import EyeDebugger from './EyeDebugger';
import '../styles/Dashboard.css';
import { fetchVideoMetadata } from '../services/videos';

function Dashboard() {
  const navigate = useNavigate(); // initialize the navigate hook
  const [eyeDebuggerOn, setEyeDebuggerOn] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('All Lectures');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [mode, setMode] = useState('pause');

  useEffect(() => {
    setMode('pause');
    fetchVideoMetadata().then(setVideos).catch(console.error);
    setTimeout(() => setEyeDebuggerOn(true), 5000);
  }, []);

  const groups = ['All Lectures', ...new Set(videos.map(v => v.group))];

  const filteredVideos = selectedGroup === 'All Lectures'
    ? videos
    : videos.filter(v => v.group === selectedGroup);

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        {!selectedVideo ? (
          <>
            <h2>{selectedGroup}</h2>
            <div className="controls-row">
              <select 
                value={selectedGroup} 
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="group-filter"
              >
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              {/* Navigate to the AddVideo form when clicked */}
              <button 
                className="add-video-button" 
                onClick={() => navigate('/add-video')}
              >
                Add Video
              </button>
            </div>
            <div className="mode-selector">
              {['pause', 'question', 'analytics'].map((m) => (
                <button
                  key={m}
                  className={`mode-button ${mode === m ? 'active' : ''}`}
                  onClick={() => setMode(m)}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)} Mode
                </button>
              ))}
            </div>
            <div className="videos-grid">
              {filteredVideos.map(video => (
                <div 
                  className="video-card" 
                  key={video.video_id}
                  onClick={() => setSelectedVideo(video)}
                >
                  <img 
                    src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`} 
                    alt={video.group}
                  />
                  <div className="video-info">
                    <h4>{video.group}</h4>
                    <small>Uploaded by: {video.uploadby}</small><br />
                    <small>Length: {video.length}</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setSelectedVideo(null)}>
              ← Back to Lectures
            </button>
            <VideoPlayer 
              mode={mode}
              lectureInfo={{
                videoId: selectedVideo.video_id,
                subject: selectedVideo.group
              }}
              userInfo={{ name: 'Test User', profile: 'default' }}
            />
          </>
        )}
      </div>
      <EyeDebugger enabled={eyeDebuggerOn} />
    </div>
  );
}

export default Dashboard;
