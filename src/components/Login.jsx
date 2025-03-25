import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import '../styles/Login.css';

// DEBUG_MODE is now false so that login checks work.
const DEBUG_MODE = false;

function Login() {
  const navigate = useNavigate();
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
        <button type="submit" disabled={loading}>
          {loading ? (<><div className="spinner"></div>Logging in...</>) : 'Log In'}
        </button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Register Here</Link>
      </p>
    </div>
  );
}

export default Login;
