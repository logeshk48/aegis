import axios from 'axios';

// logs the user out: clears tokens and tells the backend to clear the cookie
export const logout = async () => {
  try {
    await axios.post(
      'http://localhost:5000/api/auth/logout',
      {},
      { withCredentials: true }
    );
  } catch (err) {
    // even if the server call fails, we still clear local tokens
    console.error('Logout request failed:', err.message);
  }

  // clear the stored access token and user info
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userName');
};