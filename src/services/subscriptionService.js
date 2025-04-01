import axios from 'axios';
import { config } from '../config/config';

export async function getSubscriberCount(playlistId) {
  const { data } = await axios.get(`${config.baseURL}/playlists/${playlistId}/subscriber_count`, { withCredentials: true });
  if (data.status === 'success') return data.count;
  throw new Error('Failed to fetch subscriber count');
}

export async function subscribeToPlaylist(email, playlistId) {
  try {
    const { data } = await axios.post(
      `${config.baseURL}/subscriptions/subscribe`,
      { email, playlist_id: playlistId },
      { withCredentials: true }
    );
    if (data.status === 'success') return data;
    throw new Error('Subscription failed');
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function unsubscribeToPlaylist(email, playlistId) {
  try {
    const { data } = await axios.post(
      `${config.baseURL}/subscriptions/unsubscribe`,
      { email, playlist_id: playlistId },
      { withCredentials: true }
    );
    if (data.status === 'success') return data;
    throw new Error('Unsubscribe failed');
  } catch (error) {
    console.error(error);
    throw error;
  }
}