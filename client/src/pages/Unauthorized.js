import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { Lock, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          p: 5,
          mt: 10,
          textAlign: 'center',
          borderRadius: 2,
          backgroundColor: 'background.paper',
        }}
      >
        <Lock
          sx={{
            fontSize: 80,
            color: 'error.main',
            mb: 3,
          }}
        />

        <Typography variant="h3" component="h1" gutterBottom>
          Erişim Reddedildi
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Bu sayfayı görüntülemek için gerekli izinlere sahip değilsiniz.
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Eğer bu bir hata olduğunu düşünüyorsanız, lütfen sistem yöneticinizle iletişime geçin.
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            size="large"
          >
            Ana Sayfaya Dön
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Unauthorized;
