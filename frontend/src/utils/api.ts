// src/utils/api.ts
import axios from 'axios';

// ✅ 1. DEFINISIKAN isProduction MENGGUNAKAN BAWAAN VITE
// Ini akan otomatis bernilai 'true' saat di-build di Vercel, dan 'false' saat npm run dev lokal
const isProduction = import.meta.env.PROD;

// ✅ 2. TENTUKAN baseURL BERDASARKAN ENVIRONMENT
const baseURL = isProduction
  ? 'https://sahabat-digital-backend.vercel.app/api' // Pastikan URL ini sesuai dengan URL backend Vercel Anda
  : 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ 3. PERTAHANKAN INTERCEPTOR REQUEST ANDA (SUDAH SANGAT BAGUS)
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

// ✅ 4. PERTAHANKAN INTERCEPTOR RESPONSE ANDA (SUDAH SANGAT BAGUS)
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