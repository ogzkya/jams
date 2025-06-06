import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Snackbar,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Notifications as NotificationsIcon,
  Lock as SecurityIcon,
  Language as LanguageIcon,
  Save as SaveIcon,
  Backup as BackupIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    showOnlineStatus: true,
    twoFactorAuth: false,
    language: 'tr',
    autoBackup: true,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // Ayarları değiştir
  const handleSettingChange = (setting) => (event) => {
    setSettings({
      ...settings,
      [setting]: event.target.checked,
    });
  };

  // Ayarları kaydet
  const saveSettings = () => {
    // Burada API çağrısı yapılacak
    setSnackbar({
      open: true,
      message: 'Ayarlar başarıyla kaydedildi',
      severity: 'success',
    });
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Ayarlar
      </Typography>

      <Grid container spacing={3}>
        {/* Tema Ayarları */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Görünüm
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <DarkModeIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Karanlık Mod" 
                    secondary="Arayüzü karanlık veya aydınlık temada görüntüleyin"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end"
                      checked={darkMode}
                      onChange={toggleDarkMode}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Bildirim Ayarları */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bildirimler
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="E-posta Bildirimleri" 
                    secondary="Önemli olaylar hakkında e-posta alın"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end"
                      checked={settings.emailNotifications}
                      onChange={handleSettingChange('emailNotifications')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <Divider variant="inset" component="li" />

                <ListItem>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Anlık Bildirimler" 
                    secondary="Tarayıcı bildirimlerini etkinleştirin"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end"
                      checked={settings.pushNotifications}
                      onChange={handleSettingChange('pushNotifications')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Güvenlik Ayarları */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Güvenlik
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="İki Faktörlü Kimlik Doğrulama" 
                    secondary="Hesabınızı korumak için iki faktörlü kimlik doğrulamayı etkinleştirin"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end"
                      checked={settings.twoFactorAuth}
                      onChange={handleSettingChange('twoFactorAuth')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <Divider variant="inset" component="li" />

                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Çevrimiçi Durumu Göster" 
                    secondary="Diğer kullanıcılara çevrimiçi olduğunuzu gösterin"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end"
                      checked={settings.showOnlineStatus}
                      onChange={handleSettingChange('showOnlineStatus')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Veri Ayarları */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Veri ve Yedekleme
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <BackupIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Otomatik Yedekleme" 
                    secondary="Verilerinizi günlük olarak otomatik yedekleyin"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      edge="end"
                      checked={settings.autoBackup}
                      onChange={handleSettingChange('autoBackup')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <Divider variant="inset" component="li" />

                <ListItem>
                  <ListItemIcon>
                    <DeleteIcon color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Veri Temizleme" 
                    secondary="Hesap verilerini temizleyin (Bu işlem geri alınamaz)"
                  />
                  <ListItemSecondaryAction>
                    <Button 
                      variant="outlined" 
                      color="error"
                      size="small"
                      onClick={() => {
                        setSnackbar({
                          open: true,
                          message: 'Bu özellik şu anda devre dışı',
                          severity: 'warning',
                        });
                      }}
                    >
                      Temizle
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<SaveIcon />}
          onClick={saveSettings}
        >
          Ayarları Kaydet
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
