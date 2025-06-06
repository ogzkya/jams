import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Paper,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Save,
  Key,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

const TabPanel = ({ children, value, index, ...props }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`profile-tabpanel-${index}`}
    aria-labelledby={`profile-tab-${index}`}
    {...props}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const Profile = () => {
  const { user, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    position: user?.position || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // Profil formu değişikliğini dinle
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Şifre formu değişikliğini dinle
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Snackbar'ı göster
  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // Profil güncelleme
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await api.put('/api/auth/profile', profileData);
      
      if (response.data.success) {
        showSnackbar('Profil bilgileri başarıyla güncellendi', 'success');
      } else {
        showSnackbar(response.data.message || 'Güncelleme başarısız', 'error');
      }
    } catch (error) {
      logError('Profil güncelleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Şifre değiştirme
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('Yeni şifreler eşleşmiyor', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await api.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      if (response.data.success) {
        showSnackbar('Şifre başarıyla değiştirildi', 'success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        showSnackbar(response.data.message || 'Şifre değiştirme başarısız', 'error');
      }
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      showSnackbar('Şifre değiştirilirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Profilim
      </Typography>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          aria-label="profile tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Profil Bilgileri" />
          <Tab label="Şifre Değiştir" />
        </Tabs>

        {/* Profil Bilgileri Sekmesi */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      mx: 'auto',
                      mb: 2,
                      bgcolor: 'primary.main',
                      fontSize: 48,
                    }}
                  >
                    {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </Avatar>

                  <Typography variant="h5" gutterBottom>
                    {user?.firstName} {user?.lastName}
                  </Typography>

                  <Typography color="textSecondary" gutterBottom>
                    {user?.username}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Rol: {user?.role || 'Kullanıcı'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <form onSubmit={handleProfileSubmit}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      Kişisel Bilgiler
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Ad"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Soyad"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="E-posta"
                          name="email"
                          type="email"
                          value={profileData.email}
                          onChange={handleProfileChange}
                          InputProps={{
                            startAdornment: (
                              <Email color="action" sx={{ mr: 1 }} fontSize="small" />
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Telefon"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          InputProps={{
                            startAdornment: (
                              <Phone color="action" sx={{ mr: 1 }} fontSize="small" />
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Departman"
                          name="department"
                          value={profileData.department}
                          onChange={handleProfileChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Pozisyon"
                          name="position"
                          value={profileData.position}
                          onChange={handleProfileChange}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={<Save />}
                    >
                      {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </Box>
                </Card>
              </form>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Şifre Değiştirme Sekmesi */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <form onSubmit={handlePasswordSubmit}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Şifre Değiştir
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Güvenliğiniz için şifrenizi düzenli olarak değiştirmeniz önerilir.
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mevcut Şifre"
                      name="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      InputProps={{
                        startAdornment: (
                          <Key color="action" sx={{ mr: 1 }} fontSize="small" />
                        ),
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Yeni Şifre"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Yeni Şifre Tekrar"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      error={
                        passwordData.confirmPassword &&
                        passwordData.newPassword !== passwordData.confirmPassword
                      }
                      helperText={
                        passwordData.confirmPassword &&
                        passwordData.newPassword !== passwordData.confirmPassword
                          ? 'Şifreler eşleşmiyor'
                          : ''
                      }
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={<Save />}
                >
                  {loading ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                </Button>
              </Box>
            </form>
          </Card>
        </TabPanel>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
