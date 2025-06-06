import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const PrivateRoute = ({ children, requiredRoles = [], requiredPermissions = [] }) => {
  const { user, loading } = useAuth();

  // Yükleniyorsa, yükleme ekranını göster
  if (loading) {
    return <LoadingScreen />;
  }

  // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Belirli roller gerekiyorsa, kullanıcının bu rollerden birine sahip olup olmadığını kontrol et
  if (requiredRoles.length > 0) {
    // Kullanıcı rollerini array olarak kontrol et (API yanıt yapısına göre uyarlandı)
    const userRoles = Array.isArray(user.roles) ? user.roles : 
                     (typeof user.roles === 'string' ? [user.roles] : []);
                     
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Belirli yetkiler gerekiyorsa, kullanıcının bu yetkilerden birine sahip olup olmadığını kontrol et
  if (requiredPermissions.length > 0) {
    // Kullanıcı yetkilerini array olarak kontrol et
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : 
                          (typeof user.permissions === 'string' ? [user.permissions] : []);
    
    const hasRequiredPermission = requiredPermissions.some(permission => userPermissions.includes(permission));
    
    if (!hasRequiredPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Koşullar sağlanıyorsa, çocuk bileşenleri göster
  return children;
};

export default PrivateRoute;
