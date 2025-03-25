import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import '../styles/Register.css';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false); // new loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setLoading(true); // start loading
    try {
      const response = await registerUser({ email, password, firstName, lastName, age: parseInt(age) });
      console.log(response.status);
      if(response.status === "success"){
        navigate('/');
      } else {
        setErrorMsg(response.reason);
      }
    } catch (error) {
      const errMsg = error.reason || error.message || 'An error occurred during registration.';
      setErrorMsg(errMsg);
    } finally {
      setLoading(false); // end loading regardless
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      {errorMsg && <p className="error">{errorMsg}</p>}
      {loading && <p>Please wait...</p>} {/* loading message */}
      <form onSubmit={handleSubmit} className="register-form">
        <label>
          First Name:
          <input 
            type="text" 
            value={firstName} 
            onChange={(e)=>setFirstName(e.target.value)} 
            required 
          />
        </label>
        <label>
          Last Name:
          <input 
            type="text" 
            value={lastName} 
            onChange={(e)=>setLastName(e.target.value)} 
            required 
          />
        </label>
        <label>
          Age:
          <input 
            type="number" 
            value={age} 
            onChange={(e)=>setAge(e.target.value)} 
            required 
          />
        </label>
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
        <button type="submit" disabled={loading}>Register</button>
      </form>
      <p>
        Already have an account? <Link to="/">Login Here</Link>
      </p>
    </div>
  );
}

export default Register;
