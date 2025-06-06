import React, { useState, useEffect } from 'react';
import { 
  Badge, IconButton, Menu, MenuItem, List, ListItem, ListItemText, 
  ListItemAvatar, ListItemSecondaryAction, Typography, Box, 
  Divider, Button, Avatar, CircularProgress, Tooltip 
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Settings as SystemIcon,
  Delete as DeleteIcon,
  MarkChatRead as ReadIcon
} from '@mui/icons-material';
// date-fns kütüphanesini kullanmak yerine basit tarih formatlayıcı kullanacağız
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

// Tarih formatlama yardımcı fonksiyonu
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'az önce';
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} dakika önce`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} saat önce`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)} gün önce`;
  } else {
    return date.toLocaleDateString('tr-TR');
  }
};

const NotificationCenter = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  // Bildirim türüne göre ikon belirle
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'INFO':
        return <InfoIcon color="info" />;
      case 'WARNING':
        return <WarningIcon color="warning" />;
      case 'ERROR':
        return <ErrorIcon color="error" />;
      case 'SUCCESS':
        return <SuccessIcon color="success" />;
      case 'SYSTEM':
        return <SystemIcon color="secondary" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // Bildirimleri getir
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications', {
        params: { page, limit: 10 }
      });
      
      if (response.data.success) {
        if (page === 1) {
          setNotifications(response.data.data.notifications);
        } else {
          setNotifications(prev => [...prev, ...response.data.data.notifications]);
        }
      }
    } catch (error) {
      logError('Bildirimler getirilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bildirim sayısını getir
  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/api/notifications/count');
      
      if (response.data.success) {
        setNotificationCount(response.data.data.count);
      }
    } catch (error) {
      logError('Bildirim sayısı getirilemedi:', error);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      
      // Yerel state'i güncelle
      setNotifications(notifications.map(notification => {
        if (notification._id === id) {
          return {
            ...notification,
            isRead: true,
            readBy: [...(notification.readBy || []), { user: user._id, readAt: new Date() }]
          };
        }
        return notification;
      }));
      
      // Sayacı güncelle
      setNotificationCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      logError('Bildirim okundu işaretlenemedi:', error, { notificationId: id });
      showSnackbar('Bildirim işaretlenemedi', 'error');
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      
      // Yerel state'i güncelle
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true,
        readBy: [...(notification.readBy || []), { user: user._id, readAt: new Date() }]
      })));
      
      // Sayacı sıfırla
      setNotificationCount(0);
      
      showSnackbar('Tüm bildirimler okundu olarak işaretlendi', 'success');
    } catch (error) {
      logError('Tüm bildirimler okundu işaretlenemedi:', error);
      showSnackbar('İşlem sırasında bir hata oluştu', 'error');
    }
  };

  // Bildirimi sil
  const deleteNotification = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      
      // Yerel state'ten kaldır
      setNotifications(notifications.filter(notification => notification._id !== id));
      
      // Eğer okunmamış bildirimleri sildiysek sayacı güncelle
      const deletedNotification = notifications.find(n => n._id === id);
      const isUnread = deletedNotification && 
        !deletedNotification.readBy?.some(r => r.user === user._id);
      
      if (isUnread) {
        setNotificationCount(prev => Math.max(0, prev - 1));
      }
      
      showSnackbar('Bildirim silindi', 'success');
    } catch (error) {
      logError('Bildirim silinemedi:', error, { notificationId: id });
      showSnackbar('Bildirim silinemedi', 'error');
    }
  };

  // Sayfa değiştiğinde bildirimleri yeniden getir
  const loadMoreNotifications = () => {
    setPage(prev => prev + 1);
  };

  // Bildirim menüsünü aç
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  // Bildirim menüsünü kapat
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Bildirimi okundu olarak işaretle ve ilgili kaynağa git
  const handleNotificationClick = async (notification) => {
    // Önce okundu olarak işaretle
    await markAsRead(notification._id);
    
    // İlgili kaynağa yönlendir (eğer varsa)
    if (notification.relatedResource?.resourceType && notification.relatedResource?.resourceId) {
      let path;
      
      switch (notification.relatedResource.resourceType) {
        case 'User':
          path = `/users/${notification.relatedResource.resourceId}`;
          break;
        case 'Device':
          path = `/inventory/${notification.relatedResource.resourceId}`;
          break;
        case 'Server':
          path = `/servers/${notification.relatedResource.resourceId}`;
          break;
        case 'Location':
          path = `/locations/${notification.relatedResource.resourceId}`;
          break;
        default:
          path = null;
      }
      
      if (path) {
        handleCloseMenu();
        window.location.href = path;
      }
    }
  };

  // İlk yüklemede ve kullanıcı değiştiğinde bildirim sayısını getir
  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      
      // Her 60 saniyede bir bildirim sayısını güncelle
      const intervalId = setInterval(fetchNotificationCount, 60000);
      
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const menuOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Bildirimler">
        <IconButton 
          color="inherit"
          onClick={handleOpenMenu}
          aria-label="notifications"
        >
          <Badge badgeContent={notificationCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: '80vh',
            mt: 1.5
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Bildirimler 
            {notificationCount > 0 && (
              <Badge 
                badgeContent={notificationCount} 
                color="error" 
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          
          {notificationCount > 0 && (
            <Button 
              size="small" 
              onClick={markAllAsRead}
              startIcon={<ReadIcon />}
            >
              Tümünü Okundu Say
            </Button>
          )}
        </Box>
        
        <Divider />
        
        <List sx={{ pt: 0, pb: 0, maxHeight: '50vh', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="Bildiriminiz yok" 
                secondary="Yeni bildirimler burada görüntülenecek" 
              />
            </ListItem>
          ) : (
            notifications.map((notification) => {
              const isUnread = !notification.readBy?.some(r => r.user === user._id);
              
              return (
                <React.Fragment key={notification._id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      bgcolor: isUnread ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.1)'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: isUnread ? 'primary.light' : 'grey.300' }}>
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <>
                          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                            {notification.message.length > 80 
                              ? `${notification.message.substring(0, 80)}...` 
                              : notification.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        </>
                      }
                      primaryTypographyProps={{
                        fontWeight: isUnread ? 'bold' : 'normal'
                      }}
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Sil">
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider variant="inset" />
                </React.Fragment>
              );
            })
          )}
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </List>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          {notifications.length > 0 && (
            <Button 
              variant="outlined" 
              size="small"
              onClick={loadMoreNotifications}
              disabled={loading}
            >
              {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
            </Button>
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationCenter;
