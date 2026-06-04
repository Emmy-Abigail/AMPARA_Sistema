// CLIENT.TS
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ampara_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ampara_token');
      localStorage.removeItem('ampara_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
