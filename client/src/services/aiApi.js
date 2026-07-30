import api from '../api/axios';

// send natural-language text to the AI, get back created tasks
export const parseTextToTasks = async (text) => {
  const res = await api.post('/ai/parse', { text });
  return res.data; // { message, tasks }
};

// ask the AI a question about your own data
export const askAegis = async (question) => {
  const res = await api.post('/ai/ask', { question });
  return res.data; // { question, answer }
};

// get personalized AI suggestions based on your data
export const getSuggestions = async () => {
  const res = await api.get('/ai/suggestions');
  return res.data; // { suggestions: [...] }
};

// --- Diary ---

// create a diary entry (auto-extracts tasks on the backend)
export const createDiaryEntry = async (content, entryDate) => {
  const res = await api.post('/diary', { content, entryDate });
  return res.data; // { entry, extractedTasks, message }
};

// get all diary entries (newest first)
export const getDiaryEntries = async () => {
  const res = await api.get('/diary');
  return res.data;
};

// delete a diary entry
export const deleteDiaryEntry = async (id) => {
  const res = await api.delete(`/diary/${id}`);
  return res.data;
};