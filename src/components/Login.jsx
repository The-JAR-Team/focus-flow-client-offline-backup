import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, fetchUserInfo } from '../services/api';
import '../styles/Login.css';
import { useDispatch } from 'react-redux';
import { initializeDashboardData } from '../services/dashboardService';
import { setUserData } from '../redux/userSlice';
import { setDashboardData } from '../redux/dashboardSlice';

// DEBUG_MODE is now false so that login checks work.
const DEBUG_MODE = false;

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      if (response.status === "success") {
        
        // After successful login, load dashboard data
        const userData = await fetchUserInfo();
        const dashboardData = await initializeDashboardData(userData);

        // Update Redux store
        dispatch(setUserData(userData));
        dispatch(setDashboardData({
          myGenericVideos: dashboardData.myGenericVideos,
          otherGenericVideos: dashboardData.otherGenericVideos,
          myPlaylists: dashboardData.myPlaylists,
          otherPlaylists: dashboardData.otherPlaylists
        }));

        navigate('/dashboard');
      } else {
        setErrorMsg(response.reason);
      }
    } catch (error) {
      const errMsg = error.reason || error.message || 'An error occurred during login.';
      setErrorMsg(errMsg);
    }
    setLoading(false);
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    // Set the guest credentials
    const guestEmail = 'g@g.g';
    const guestPassword = '1';
    
    try {
      const response = await loginUser({ email: guestEmail, password: guestPassword });
      if (response.status === "success") {
        // After successful login, load dashboard data
        const userData = await fetchUserInfo();
        const dashboardData = await initializeDashboardData(userData);

        // Update Redux store
        dispatch(setUserData(userData));
        dispatch(setDashboardData({
          myGenericVideos: dashboardData.myGenericVideos,
          otherGenericVideos: dashboardData.otherGenericVideos,
          myPlaylists: dashboardData.myPlaylists,
          otherPlaylists: dashboardData.otherPlaylists
        }));

        navigate('/dashboard');
      } else {
        setErrorMsg(response.reason);
      }
    } catch (error) {
      const errMsg = error.reason || error.message || 'An error occurred during guest login.';
      setErrorMsg(errMsg);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Email:
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="JAR@gmail.com"
            required 
          />
        </label>
        <label>
          Password:
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </label>
        {errorMsg && <p className="error">{errorMsg}</p>}
        <button 
          type="submit" 
          disabled={loading}
          className={`login-form-button ${loading ? 'loading-button' : ''}`}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              <span className="loading-text">Logging in...</span>
            </>
          ) : 'Log In'}
        </button>
      </form>
      <div className="login-options">
        <p>
          Don't have an account? <Link to="/register">Register Here</Link>
        </p>
        <button 
          type="button"
          onClick={handleGuestLogin}
          disabled={loading}
          className="guest-login-button"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}

export default Login;
