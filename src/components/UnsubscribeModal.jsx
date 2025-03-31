import React, { useState } from 'react';
import { unsubscribeToPlaylist } from '../services/subscriptionService';

function UnsubscribeModal({ playlistId, onClose, onUnsubscribed }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await unsubscribeToPlaylist(email, playlistId);
      onUnsubscribed();
      onClose();
    } catch (err) {
      setError('Unsubscription failed.');
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
        <h3>Unsubscribe from Playlist</h3>
        <form onSubmit={handleUnsubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Unsubscribing...' : 'Unsubscribe'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default UnsubscribeModal;
