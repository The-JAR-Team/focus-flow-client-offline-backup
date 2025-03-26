import axios from 'axios';

axios.defaults.withCredentials = true; // Global setting for credentials

// services/api.js

// Define your base URL and endpoints
const BASE_URL = 'https://focus-flow-236589840712.me-west1.run.app'; // Replace with your actual API base URL
//const BASE_URL = 'http://127.0.0.1:5000'; // Replace with your actual API base URL

const LOGIN_ENDPOINT = `${BASE_URL}/login`;
const REGISTER_ENDPOINT = `${BASE_URL}/register`;

const DEBUG_MODE = true;

// Simulated login API call
export const loginUser = async ({ email, password }) => {
  try {
    //const response = await axios.post(LOGIN_ENDPOINT, { email, password }); // using axios
        const response = await axios.post(LOGIN_ENDPOINT, { email, password }, { withCredentials: true });
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
    }, { withCredentials: true }); // using axios with credentials
    return response.data;
  } catch (error) {
    if (error.response?.data?.reason) {
      throw error.response.data;
    }
    throw error;
  }
};
