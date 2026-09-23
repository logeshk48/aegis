import api from '../api/axios';

// the agent's base path — change here if your agentRoutes mounts differently
const AGENT = '/agent';

// send natural-language text to the AI, get back created tasks
export const parseTextToTasks = async (text) => {
  const res = await api.post('/ai/parse', { text });
  return res.data; // { message, tasks }
};

// ask the AI a question about your own data (read-only)
export const askAegis = async (question) => {
  const res = await api.post('/ai/ask', { question });
  return res.data; // { question, answer }
};

// get personalized AI suggestions based on your data
export const getSuggestions = async () => {
  const res = await api.get('/ai/suggestions');
  return res.data; // { suggestions: [...] }
};

// --- Agent (can read AND act) ---

// returns { reply, steps } — or { reply, steps, proposal, needsApproval }
// when the change was big enough to need confirming first
export const runAgent = async (message, history = []) => {
  const res = await api.post(AGENT, { message, history });
  return res.data;
};

export const approveAgentProposal = async (proposalId) => {
  const res = await api.post(`${AGENT}/approve`, { proposalId });
  return res.data; // { reply, steps, applied, failed }
};

export const rejectAgentProposal = async (proposalId) => {
  const res = await api.post(`${AGENT}/reject`, { proposalId });
  return res.data; // { reply }
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