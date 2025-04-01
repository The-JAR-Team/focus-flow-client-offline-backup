import axios from 'axios';
import { config } from '../config/config';

axios.defaults.withCredentials = true; // Global setting for credentials

// services/api.js

// Define your base URL and endpoints
const LOGIN_ENDPOINT = `${config.baseURL}/login`;
const REGISTER_ENDPOINT = `${config.baseURL}/register`;

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

export const fetchUserInfo = async () => {
  try {
    const response = await axios.get(`${config.baseURL}/user_info`, { withCredentials: true });
    if (response.status !== 200) throw new Error("Failed to fetch user info");
    return response.data.user;
  } catch (error) {
    if (error.response?.data?.reason) {
      throw error.response.data;
    }
    throw error;
  }
};

// New logout API call
export const logoutUser = async () => {
  try {
    const response = await axios.post(`${config.baseURL}/logout`, {}, { withCredentials: true });
    if (response.status !== 200) throw new Error("Failed to logout");
    return response.data;
  } catch (error) {
    if (error.response?.data?.reason) {
      throw error.response.data;
    }
    throw error;
  }
};
