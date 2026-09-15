import api from '../api/axios';

export const getDrift = async () => {
  const res = await api.get('/drift');
  return res.data;
};