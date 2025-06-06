import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Sayfa yenilendiğinde kullanıcı bilgilerini kontrol et
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          // Token varsa kullanıcı bilgilerini al
          // Endpoint düzeltildi: /users/me -> /api/auth/me
          const response = await api.get('/api/auth/me');
          
          if (response.data && (response.data.success || response.data.user)) {
            // API yanıt yapısına göre kullanıcı verisi alınıyor
            const userData = response.data.data?.user || response.data.user || response.data;
            setUser(userData);
          } else {
            // Başarısız bir cevap alındığında tokenı ve kullanıcıyı temizle
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (err) {
        logError('Auth check failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Giriş fonksiyonu
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Endpoint düzeltildi: /users/login -> /api/auth/login
      const response = await api.post('/api/auth/login', credentials);
      
      if (response.data && (response.data.success || response.data.token)) {
        // API yanıt yapısına göre token ve kullanıcı verisi alınıyor
        const token = response.data.data?.token || response.data.token;
        const userData = response.data.data?.user || response.data.user || {};
        
        // Token ve kullanıcı bilgilerini localStorage'a kaydet
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        return { success: true };
      } else {
        setError(response.data.message || 'Giriş başarısız');
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Giriş sırasında bir hata oluştu';
      setError(errorMsg);
      logError('Login failed in AuthContext', err, { email: credentials.email });
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    try {
      // Sunucuya logout isteği göndermeyi dene (opsiyonel)
      await api.post('/api/auth/logout').catch(() => {});
    } finally {
      // Her durumda yerel verileri temizle
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Kullanıcının belirli bir rolü olup olmadığını kontrol et
  const hasRole = (role) => {
    if (!user || !role) return false;
    
    // Roller dizi veya string olabilir
    const roles = Array.isArray(user.roles) ? user.roles : 
                 (typeof user.roles === 'string' ? [user.roles] : []);
                 
    return roles.includes(role);
  };

  // Kullanıcının belirli bir yetkisi olup olmadığını kontrol et
  const hasPermission = (permission) => {
    if (!user || !permission) return false;
    
    // İzinler dizi veya string olabilir
    const permissions = Array.isArray(user.permissions) ? user.permissions : 
                       (typeof user.permissions === 'string' ? [user.permissions] : []);
                       
    return permissions.includes(permission);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    hasRole,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
