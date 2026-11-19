// src/utils/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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

    // 401 = token benar-benar invalid/kedaluwarsa → bersihkan & reset sesi
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // 403 (mis. pembatasan kelas) → JANGAN reload. Biarkan frontend yang
    // menampilkan pesan ramah, sehingga user tetap login & bisa akses materi/soal.
    return Promise.reject(error);
  },
);

export default api;