import api from '../api/axios';

export const getMemories = async () => {
  const res = await api.get('/memories');
  return res.data;
};

export const createMemory = async (content, category) => {
  const res = await api.post('/memories', { content, category });
  return res.data;
};

export const updateMemory = async (id, updates) => {
  const res = await api.put(`/memories/${id}`, updates);
  return res.data;
};

export const deleteMemory = async (id) => {
  const res = await api.delete(`/memories/${id}`);
  return res.data;
};

export const clearMemories = async () => {
  const res = await api.delete('/memories');
  return res.data;
};