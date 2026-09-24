import api from '../api/axios';

// { lastNight, pendingWake, needsConfirm, rhythm, capacity, nights }
export const getSleep = async () => {
  const res = await api.get('/sleep');
  return res.data;
};

export const logBedtime = async (at) => {
  const res = await api.post('/sleep/bed', at ? { at } : {});
  return res.data;
};

export const logWake = async (at) => {
  const res = await api.post('/sleep/wake', at ? { at } : {});
  return res.data;
};

// accept an inferred night without editing it
export const confirmNight = async (date) => {
  const res = await api.post(`/sleep/${date}/confirm`);
  return res.data;
};

export const correctNight = async (date, { sleepAt, wakeAt, note }) => {
  const res = await api.put(`/sleep/${date}`, { sleepAt, wakeAt, note });
  return res.data;
};