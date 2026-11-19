// src/utils/api.ts
import axios from 'axios';

const isProduction = import.meta.env.PROD;

const baseURL = isProduction
  ? 'https://sahabat-digital-backend.vercel.app/api'
  : 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  // ❌ HAPUS blok headers di sini!
  // axios akan auto-detect Content-Type berdasarkan body yang dikirim
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;