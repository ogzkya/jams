const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const inventoryRoutes = require('./src/routes/inventory');
const locationRoutes = require('./src/routes/locations');
const passwordRoutes = require('./src/routes/passwords');
const serverRoutes = require('./src/routes/servers');
const auditRoutes = require('./src/routes/audit');

const errorHandler = require('./src/middleware/errorHandler');
const { initializeDefaultRoles } = require('./src/utils/defaultData');

const app = express();

// Güvenlik middleware'leri
app.use(helmet());

// CORS yapılandırması
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3001'],
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 dakika
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // IP başına maksimum istek
  message: 'Bu IP adresinden çok fazla istek geldi, lütfen daha sonra tekrar deneyin.',
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Statik dosyalar
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/audit', auditRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'Modüler Kurumsal Yönetim Platformu API',
    version: '1.0.0',
    status: 'Çalışıyor',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      inventory: '/api/inventory',
      locations: '/api/locations',
      passwords: '/api/passwords',
      servers: '/api/servers',
      audit: '/api/audit'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı'
  });
});

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kurumsal_yonetim_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB bağlantısı başarılı');
  // Varsayılan rolleri oluştur
  await initializeDefaultRoles();
})
.catch((error) => {
  console.error('MongoDB bağlantı hatası:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı');
  server.close(() => {
    console.log('HTTP server kapatıldı');
    mongoose.connection.close(false, () => {
      console.log('MongoDB bağlantısı kapatıldı');
      process.exit(0);
    });
  });
});

module.exports = app;
