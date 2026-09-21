import api from '../api/axios';

export const getMission = async () => (await api.get('/focus/mission')).data;

export const getActiveFocus = async () => (await api.get('/focus/active')).data;

export const startFocus = async ({ taskId, plannedMinutes, isExtraRound, driftState }) =>
  (await api.post('/focus/start', { taskId, plannedMinutes, isExtraRound, driftState })).data;

export const pauseFocus = async (id) => (await api.post(`/focus/${id}/pause`)).data;

export const resumeFocus = async (id) => (await api.post(`/focus/${id}/resume`)).data;

export const endFocus = async (id, outcome) =>
  (await api.post(`/focus/${id}/end`, { outcome })).data;

export const reflectFocus = async (id, { completeTask, reflection }) =>
  (await api.post(`/focus/${id}/reflect`, { completeTask, reflection })).data;