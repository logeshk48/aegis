import api from '../api/axios';

// ---- mission + focus sessions ----

export const getMission = async () => (await api.get('/focus/mission')).data;

export const getActiveFocus = async () => (await api.get('/focus/active')).data;

export const startFocus = async ({ taskId, plannedMinutes, isExtraRound, driftState, title }) =>
  (await api.post('/focus/start', { taskId, plannedMinutes, isExtraRound, driftState, title }))
    .data;

export const pauseFocus = async (id) => (await api.post(`/focus/${id}/pause`)).data;

export const resumeFocus = async (id) => (await api.post(`/focus/${id}/resume`)).data;

export const endFocus = async (id, outcome) =>
  (await api.post(`/focus/${id}/end`, { outcome })).data;

export const reflectFocus = async (id, { completeTask, reflection }) =>
  (await api.post(`/focus/${id}/reflect`, { completeTask, reflection })).data;

// ---- task helpers used by the mission card ----

// pass null to clear the planned time
export const scheduleTask = async (id, date) =>
  (await api.put(`/tasks/${id}`, { scheduledAt: date ? date.toISOString() : null })).data;

export const setTaskKind = async (id, kind) =>
  (await api.put(`/tasks/${id}`, { kind })).data;

export const completeTask = async (id) => (await api.patch(`/tasks/${id}/toggle`)).data;