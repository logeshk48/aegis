import axios from 'axios';

// create a pre-configured axios instance for our backend
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // send cookies (for the refresh token)
});

// REQUEST interceptor: attach the access token before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor: if a request fails with 401, try to refresh the token once
api.interceptors.response.use(
  (response) => response, // if the response is fine, just pass it through
  async (error) => {
    const originalRequest = error.config;

    // if it's a 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // mark it so we don't loop forever

      try {
        // ask the backend for a new access token (uses the refresh cookie)
        const res = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newToken = res.data.accessToken;
        localStorage.setItem('accessToken', newToken);

        // update the failed request with the new token and retry it
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // refresh also failed → the refresh token is gone/expired → log out
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userName');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;