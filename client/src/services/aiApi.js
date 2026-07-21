import api from '../api/axios';

// send natural-language text to the AI, get back created tasks
export const parseTextToTasks = async (text) => {
  const res = await api.post('/ai/parse', { text });
  return res.data; // { message, tasks }
};

// ask a question about your own data (RAG)
export const askAegis = async (question) => {
  const res = await api.post('/ai/ask', { question });
  return res.data; // { question, answer }
};