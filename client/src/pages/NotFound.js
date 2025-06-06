import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { SentimentDissatisfied, Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
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
        <SentimentDissatisfied
          sx={{
            fontSize: 100,
            color: 'warning.main',
            mb: 3,
          }}
        />

        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>

        <Typography variant="h4" gutterBottom>
          Sayfa Bulunamadı
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/')}
          >
            Ana Sayfaya Dön
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;
