import axios from 'axios';
import { logWarning, logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

// API URL'i env değişkenlerinden al, yoksa varsayılan kullan
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - token eklemek için
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 401 hatalarını yakalamak için
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // JWT token süresinin dolduğu durumda güvenle çıkış yap
      const token = localStorage.getItem('token');
      
      // Önceki rotayı kaydet (giriş sonrası yönlendirmek için)
      if (window.location.pathname !== '/login') {
        localStorage.setItem('redirectPath', window.location.pathname);
      }
      
      // Saklanan kimlik bilgilerini temizle
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      // Login ekranına yönlendir
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    else if (error.response && error.response.status === 403) {
      logWarning('Yetkisiz erişim denemesi:', { url: error.config.url });
      
      // Kullanıcıyı yetkilendirme hatası sayfasına yönlendir
      if (window.location.pathname !== '/unauthorized' && 
          window.location.pathname !== '/login') {
        window.location.href = '/unauthorized';
      }
    }
    else if (error.response && error.response.status === 422) {
      window.location.href = '/login';
    }
    else if (error.response) {
      // Diğer API yanıt hataları için genel loglama
      logError(`API response error for ${error.config.url}`, error.response, { status: error.response.status, data: error.response.data });
    } else if (error.request) {
      // İstek yapıldı ancak yanıt alınamadı
      logError(`API request error (no response) for ${error.config.url}`, error.request);
    } else {
      // İsteği ayarlarken bir şeyler oldu
      logError('API setup error', error);
    }
    return Promise.reject(error);
  }
);

export default api;
