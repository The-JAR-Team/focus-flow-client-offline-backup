// services/api.js

// Define your base URL and endpoints
const BASE_URL = 'https://api.example.com'; // Replace with your actual API base URL
const LOGIN_ENDPOINT = `${BASE_URL}/login`;
const REGISTER_ENDPOINT = `${BASE_URL}/register`;

// Set this flag to true during development/debugging
const DEBUG_MODE = true;

export const fetchQuestionsForVideo = async (videoId) => {
  // Simulated API call: return dummy question data
  return [
    {
      q_id: 1,
      question: 'What is the main topic of the lecture?',
      answer1: 'Topic A',
      answer1_correct: true,
      answer2: 'Topic B',
      answer2_correct: false,
      answer3: 'Topic C',
      answer3_correct: false,
      answer4: 'Topic D',
      answer4_correct: false,
      time_start_I_can_ask_about_it: '00:05:00',
    },
  ];
};

// Simulated login API call
export const loginUser = async ({ email, password }) => {
  if (DEBUG_MODE) {
    // Simulate a network call with a delay.
    return new Promise((resolve) => {
      setTimeout(() => {
        // For our fake API, if email is "test@example.com" and password is "password", we succeed.
        if (email === 'test@example.com' && password === 'password') {
          resolve({
            success: true,
            authToken: 'FAKE_JWT_TOKEN_XYZ789',
            user: {
              id: 1,
              email,
            },
          });
        } else {
          resolve({
            success: false,
            error: 'Invalid email or password',
          });
        }
      }, 1000);
    });
  } else {
    // Real server call using fetch
    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

// Simulated register API call
export const registerUser = async ({ email, password }) => {
  if (DEBUG_MODE) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Fake condition: if email is not already taken
        if (email !== 'test@example.com') {
          // Optionally generate a token upon registration or wait for a separate login step
          const authToken = 'fake-jwt-token-registered';
          resolve({
            success: true,
            token: authToken,
            user: {
              id: 2,
              name: 'New User',
              email,
            },
          });
        } else {
          resolve({
            success: false,
            error: 'User already exists',
          });
        }
      }, 1000);
    });
  } else {
    // Real server call using fetch
    try {
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};
