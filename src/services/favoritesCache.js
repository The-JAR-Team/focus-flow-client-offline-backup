/**
 * A simple favorites utility file - no caching for now
 */

// Event system for notifying components of favorites changes
const subscribers = new Set();

/**
 * Subscribe to favorites changes notifications
 * @param {Function} callback Function to call when favorites change
 * @returns {Function} Unsubscribe function
 */
export const subscribeFavorites = (callback) => {
  subscribers.add(callback);
  
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
  };
};

/**
 * Notify all subscribers about favorites changes
 */
export const notifyFavoritesChanged = () => {
  subscribers.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error('Error in favorites subscriber:', error);
    }
  });
};