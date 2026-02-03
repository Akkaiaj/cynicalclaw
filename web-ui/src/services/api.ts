import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const TOKEN = localStorage.getItem('cynicalclaw_token');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

export const fetchMemories = async (query: string) => {
  const res = await api.get(`/memories?q=${encodeURIComponent(query)}`);
  return res.data;
};

export const fetchStats = async () => {
  const res = await api.get('/stats');
  return res.data;
};

export const sendChatMessage = async (content: string, options: any = {}) => {
  const res = await api.post('/chat', { content, ...options });
  return res.data;
};

export default api;
