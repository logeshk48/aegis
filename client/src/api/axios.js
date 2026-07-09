import axios from 'axios';

// create a pre-configured axios instance for our backend
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // send cookies (for the refresh token)
});

// before every request, attach the access token if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;