import axios from 'axios';
import { BASE_URL } from '../config/config';

export const getVideoQuestions = async (videoId) => {
  try {
    const response = await axios.get(`${BASE_URL}/videos/${videoId}/questions`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch questions');
  }
};


