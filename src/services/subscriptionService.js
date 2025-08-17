// Offline stub: subscriptions are disabled

export async function getSubscriberCount(playlistId) {
  return 0;
}

export async function subscribeToPlaylist(email, playlistId) {
  return { status: 'failed', reason: 'Subscriptions disabled offline' };
}

export async function unsubscribeToPlaylist(email, playlistId) {
  return { status: 'failed', reason: 'Subscriptions disabled offline' };
}