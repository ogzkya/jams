import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  Email,
  Person,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // AuthContext'ten setError almak için
import { logError } from '../../../utils/errorLogger'; // errorLogger'ı içe aktar (yolun doğruluğunu kontrol edin)

export default function Login() {
  const { login, error: authError, setError: setAuthError } = useAuth(); // setError'ı AuthContext'ten alın veya lokal state kullanın
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const redirectPath = localStorage.getItem('redirectPath') || '/';
      navigate(redirectPath);
      localStorage.removeItem('redirectPath');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    setLoading(true);
    // setLocalError(null); // Lokal error state kullanılıyorsa
    if (setAuthError) setAuthError(null); // AuthContext'teki error'u temizle

    try {
      const result = await login({ email, password });
      if (!result.success) {
        // login fonksiyonu zaten setError çağırıyorsa burada tekrar çağırmaya gerek yok.
        // Eğer login fonksiyonu hata mesajını döndürüyorsa:
        // setLocalError(result.message || 'Giriş başarısız oldu.');
        // logError('Login attempt failed by login function logic', { email, message: result.message });
      }
      // Başarılı giriş durumunda yönlendirme AuthContext içinde yapılabilir.
    } catch (err) {
      // Bu blok genellikle login fonksiyonu bir exception fırlattığında çalışır.
      // AuthContext'teki login fonksiyonu zaten kendi içinde hata yönetimi yapıyorsa (setError çağırıyorsa),
      // bu catch bloğu sadece beklenmedik hatalar için olabilir.
      const errorMessage = err.response?.data?.message || err.message || 'Giriş sırasında beklenmedik bir hata oluştu.';
      if (setAuthError) {
        setAuthError(errorMessage);
      } else {
        // setLocalError(errorMessage); // Lokal error state kullanılıyorsa
      }
      logError('Login page handleSubmit catch block error', err, { email });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlined />
          </Avatar>
          <Typography component="h1" variant="h5" gutterBottom>
            Giriş Yap
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Kullanıcı Adı veya E-posta"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Şifre"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Link href="#" variant="body2" onClick={(e) => e.preventDefault()}>
                Şifreni mi unuttun?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
