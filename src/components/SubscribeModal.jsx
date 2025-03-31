import React, { useState } from 'react';
import { subscribeToPlaylist } from '../services/subscriptionService';

function SubscribeModal({ playlistId, onClose, onSubscribed }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await subscribeToPlaylist(email, playlistId);
      onSubscribed();
      onClose();
    } catch (err) {
      setError('Subscription failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" style={{ position: 'relative' }}>
        <button 
          className="modal-close" 
          onClick={onClose}
          style={{ position: 'absolute', top: '10px', right: '10px' }} // now relative to modal-content
        >
          ×
        </button>
        <h3>Subscribe to Playlist</h3>
        <form onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default SubscribeModal;