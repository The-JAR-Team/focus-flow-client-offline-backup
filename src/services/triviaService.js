import axios from 'axios';
import { config } from '../config/config';

export const getVideoQuestions = async (videoId) => {
  try {
    const response = await axios.get(`${config.baseURL}/videos/${videoId}/questions`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch questions');
  }
};


