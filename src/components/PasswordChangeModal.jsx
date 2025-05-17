import React, { useState, useEffect } from 'react';
import { changePassword } from '../services/userService';
import '../styles/PasswordChangeModal.css';

function PasswordChangeModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState('');

  // Calculate password strength when newPassword changes
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      setPasswordFeedback('');
      return;
    }
    
    let strength = 0;
    let feedback = [];
    
    if (newPassword.length >= 8) {
      strength += 1;
    } else {
      feedback.push('at least 8 characters');
    }
    
    if (/[A-Z]/.test(newPassword)) {
      strength += 1;
    } else {
      feedback.push('uppercase letter');
    }
    
    if (/[a-z]/.test(newPassword)) {
      strength += 1;
    } else {
      feedback.push('lowercase letter');
    }
    
    if (/[0-9]/.test(newPassword)) {
      strength += 1;
    } else {
      feedback.push('number');
    }
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      strength += 1;
    } else {
      feedback.push('special character');
    }
    
    setPasswordStrength(strength);
    
    if (feedback.length > 0) {
      setPasswordFeedback(`Add ${feedback.join(', ')}`);
    } else {
      setPasswordFeedback('Strong password!');
    }
  }, [newPassword]);  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // No longer rejecting weak passwords - just showing a warning
    if (passwordStrength < 3) {
      console.warn('User proceeding with a weak password');
      // Consider adding an additional confirmation step here if you want
    }

    try {
      setIsSubmitting(true);
      // Call the API to change password
      const result = await changePassword(currentPassword, newPassword);
      setSuccess(result.message || 'Password changed successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="password-modal">
        <div className="modal-header">
          <h2>Change Password</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
            <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
            />
            {newPassword && (                <div className="password-strength-container">
                <div className="strength-bar">
                  <div 
                    className={`strength-indicator strength-${passwordStrength}`} 
                    style={{ width: `${passwordStrength * 20}%` }}
                  ></div>
                </div>
                <span className={`strength-text strength-${passwordStrength}`}>
                  {passwordStrength === 0 && 'Very weak'}
                  {passwordStrength === 1 && 'Weak'}
                  {passwordStrength === 2 && 'Fair'}
                  {passwordStrength === 3 && 'Good'}
                  {passwordStrength === 4 && 'Strong'}
                  {passwordStrength === 5 && 'Very strong'}
                </span>
                <p className="strength-feedback">{passwordFeedback}</p>
                {passwordStrength < 3 && (
                  <p className="password-warning">
                    A stronger password is recommended for better security, but you may continue with this one.
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordChangeModal;
