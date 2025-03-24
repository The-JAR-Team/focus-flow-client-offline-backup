import axios from 'axios';

// services/api.js

// Define your base URL and endpoints
const BASE_URL = 'https://focus-flow-236589840712.me-west1.run.app'; // Replace with your actual API base URL
const LOGIN_ENDPOINT = `${BASE_URL}/login`;
const REGISTER_ENDPOINT = `${BASE_URL}/register`;

const DEBUG_MODE = true;

// Simulated login API call
export const loginUser = async ({ email, password }) => {
  try {
    const response = await axios.post(LOGIN_ENDPOINT, { email, password }); // using axios
    return response.data;
  } catch (error) {
    // changed: throw error.response.data if reason available
    if (error.response?.data?.reason) {
      throw error.response.data;
    }
    throw error;
  }
};

// Simulated register API call
export const registerUser = async ({ email, password, firstName, lastName, age }) => {
  try {
    const response = await axios.post(REGISTER_ENDPOINT, {
      "email": email,
      "password": password,
      "first name": firstName, // changed key
      "last name": lastName,   // changed key
      "age": age,
    }); // using axios with updated request body
    return response.data;
  } catch (error) {
    if (error.response?.data?.reason) {
      throw error.response.data;
    }
    throw error;
  }
};
