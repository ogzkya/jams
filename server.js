const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config({ path: './backend/.env' });

const authRoutes = require('./backend/src/routes/auth');
const userRoutes = require('./backend/src/routes/users');
const inventoryRoutes = require('./backend/src/routes/inventory');
// const locationRoutes = require('./backend/src/routes/locations');
// const passwordRoutes = require('./backend/src/routes/passwords');
// const serverRoutes = require('./backend/src/routes/servers');
// const auditRoutes = require('./backend/src/routes/audit');

const { errorHandler } = require('./backend/src/middleware/errorHandler');
const { initializeDefaultRoles } = require('./backend/src/utils/defaultData');
const { logError } = require('./utils/errorLogger'); // errorLogger'ı içe aktar

// Mongoose ayarları
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // Buffer komutlarını devre dışı bırak

// Express app oluştur
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/locations', locationRoutes);
// app.use('/api/passwords', passwordRoutes);
// app.use('/api/servers', serverRoutes);
// app.use('/api/audit', auditRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'JAMS API',
    version: '1.0.0',
    status: 'Çalışıyor',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Sağlık kontrol endpoint'i
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 120000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
})
.then(async () => {
  console.log('MongoDB bağlantısı başarılı');
  console.log(`Veritabanı: ${mongoose.connection.name}`);
  
  // Varsayılan rolleri oluştur - zaman aşımı kontrolü ile
  try {
    console.log('Varsayılan roller kontrol ediliyor...');
    const initPromise = initializeDefaultRoles();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Varsayılan rollerin başlatılması 15 saniye içinde tamamlanamadı (zaman aşımı).')), 15000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    console.log('Varsayılan roller başarıyla kontrol edildi.');
  } catch (error) {
    logError('Varsayılan roller oluşturulurken/kontrol edilirken hata oluştu:', error.message, error);
    // Bu hata kritik değilse sunucunun çalışmaya devam etmesine izin verilebilir.
    // Ancak, roller uygulamanın temel işleyişi için kritikse, burada process.exit(1) düşünülebilir.
  }
})
.catch(error => { // mongoose.connect() için genel catch bloğu
  logError('MongoDB ilk bağlantı hatası. Sunucu başlatılamadı.', error.message, error);
  process.exit(1); // Bağlantı başarısız olursa sunucuyu sonlandır
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
