// Offline API replacements: read from public/offline and work without a server.

// Simulated login – always succeed in offline mode
export const loginUser = async () => {
  return { status: 'success' };
};

// Simulated register – not supported offline
export const registerUser = async () => {
  return { status: 'failed', reason: 'Registration is disabled in offline mode' };
};

// Load user info from offline JSON
export const fetchUserInfo = async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}offline/user_info.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load offline user info');
  const data = await res.json();
  return data.user;
};

// Offline logout – nothing to do, caller should clear local state
export const logoutUser = async () => {
  return { status: 'success' };
};
