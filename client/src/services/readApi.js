import api from '../api/axios';

export const getRead = async (refresh = false) => {
  const res = await api.get(`/read${refresh ? '?refresh=true' : ''}`);
  return res.data;
};