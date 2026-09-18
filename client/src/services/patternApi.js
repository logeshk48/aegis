import api from '../api/axios';

export const getPatterns = async (refresh = false) => {
  const res = await api.get(`/patterns${refresh ? '?refresh=true' : ''}`);
  return res.data;
};