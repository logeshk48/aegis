import api from '../api/axios';

export const sendToAgent = async (message, history = []) => {
  const res = await api.post('/agent', { message, history });
  return res.data;
};