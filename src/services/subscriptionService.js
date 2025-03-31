import axios from 'axios';

const BASE_URL = 'https://focus-flow-236589840712.me-west1.run.app'; // Replace with your actual API base URL

export async function getSubscriberCount(playlistId) {
  const { data } = await axios.get(`${BASE_URL}/playlists/${playlistId}/subscriber_count`, { withCredentials: true });
  if (data.status === 'success') return data.count;
  throw new Error('Failed to fetch subscriber count');
}

export async function subscribeToPlaylist(email, playlistId) {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/subscriptions/subscribe`,
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
      `${BASE_URL}/subscriptions/unsubscribe`,
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