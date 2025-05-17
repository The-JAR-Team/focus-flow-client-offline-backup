import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { fetchUserStats } from '../services/userService';
import Navbar from './Navbar';
import Spinner from './Spinner';
import PasswordChangeModal from './PasswordChangeModal';
import '../styles/MyAccount.css';

function MyAccount() {
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  // Get user information from Redux store
  const user = useSelector(state => state.user.user);

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        setIsLoading(true);
        const stats = await fetchUserStats();
        setUserStats(stats);
      } catch (err) {
        console.error('Error loading user statistics:', err);
        setError('Failed to load user statistics. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserStats();
  }, []);

  const togglePasswordModal = () => {
    setShowPasswordModal(!showPasswordModal);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <Navbar />
        <div className="my-account-container">
          <div className="loading-container">
            <Spinner size="large" message="Loading user information..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Navbar />
      <div className="my-account-container">
        <div className="account-header">
          <h1>My Account</h1>
          <div className="account-actions">
            <button 
              className="password-change-btn" 
              onClick={togglePasswordModal}
            >
              Change Password
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="user-profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </div>
            <div className="profile-info">
              <h2>{user?.first_name} {user?.last_name}</h2>
              <p className="user-email">{user?.email}</p>
              <p className="user-details">Age: {user?.age}</p>
              <p className="user-details">User ID: {user?.user_id}</p>
              <p className="user-role">
                Role: {user?.permission === 2 ? 'Admin' : user?.permission === 1 ? 'Teacher' : 'Student'}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h2>Your Activity Statistics</h2>
          
          {userStats && (
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">📺</div>
                <div className="stat-value">{userStats.totalVideos || 0}</div>
                <div className="stat-label">Total Videos</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-value">{userStats.playlistsCount || 0}</div>
                <div className="stat-label">Playlists</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">{userStats.watchTimeHours || 0}</div>
                <div className="stat-label">Watch Hours</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{userStats.quizzesCompleted || 0}</div>
                <div className="stat-label">Quizzes Completed</div>
              </div>
            </div>
          )}
        </div>

        {userStats?.recentPlaylists && userStats.recentPlaylists.length > 0 && (
          <div className="recent-activity">
            <h2>Recent Playlists</h2>
            <div className="recent-playlists">
              {userStats.recentPlaylists.map(playlist => (
                <div className="playlist-card" key={playlist.playlist_id}>
                  <h3>{playlist.playlist_name}</h3>
                  <p>{playlist.playlist_items.length} videos</p>
                  <div className="playlist-stats">
                    <span>{playlist.playlist_permission}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userStats?.recentVideos && userStats.recentVideos.length > 0 && (
          <div className="recent-activity">
            <h2>Recently Watched</h2>
            <div className="recent-videos">
              {userStats.recentVideos.map(video => (
                <div className="video-card" key={video.video_id}>
                  <div className="video-thumbnail">
                    <img 
                      src={`https://img.youtube.com/vi/${video.external_id}/mqdefault.jpg`} 
                      alt={video.video_name} 
                    />
                    <div className="progress-bar">
                      <div 
                        className="progress" 
                        style={{ 
                          width: `${video.watch_item ? 
                            (video.watch_item.current_time / convertTimeToSeconds(video.length)) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="video-info">
                    <h3>{video.video_name}</h3>
                    <p>{video.subject}</p>
                    <p className="video-length">{video.length}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {showPasswordModal && (
        <PasswordChangeModal onClose={togglePasswordModal} />
      )}
    </div>
  );
}

// Helper function to convert time string (like "1:05:30") to seconds
function convertTimeToSeconds(timeString) {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) {
    // Hours:Minutes:Seconds
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // Minutes:Seconds
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export default MyAccount;
