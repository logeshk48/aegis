import api from '../api/axios';

// logs the user out: clears tokens and tells the backend to clear the cookie
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.error('Logout request failed:', err.message);
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('userName');
};