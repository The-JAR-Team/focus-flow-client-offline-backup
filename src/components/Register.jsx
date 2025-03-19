import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Register.css';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate registration logic
    navigate('/');
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <label>
          Email:
          <input 
            type="email" 
            value={email} 
            onChange={(e)=>setEmail(e.target.value)} 
            required 
          />
        </label>
        <label>
          Password:
          <input 
            type="password" 
            value={password} 
            onChange={(e)=>setPassword(e.target.value)} 
            required 
          />
        </label>
        <label>
          Confirm Password:
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e)=>setConfirmPassword(e.target.value)} 
            required 
          />
        </label>
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/">Login Here</Link>
      </p>
    </div>
  );
}

export default Register;
