require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { applySecurityMiddleware } = require('./middleware/security');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { logError } = require('../../utils/errorLogger');

const app = express();

// Nginx veya benzeri bir ters proxy arkasında çalışıyorsanız, istemci IP adreslerini doğru bir şekilde almak için bu ayarı etkinleştirin.
// Örneğin, Heroku, AWS ELB gibi platformlarda bu gerekli olabilir.
// app.set('trust proxy', 1); // '1' bir hop anlamına gelir. Ortamınıza göre ayarlayın.

// Temel middleware'ler
app.use(express.json({ limit: '10kb' })); // Request body boyutunu sınırlama
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Güvenlik middleware'leri
applySecurityMiddleware(app);

// Loglama
app.use(morgan('combined'));

// MongoDB bağlantısı
try {
  connectDB();
} catch (error) {
  logError('CRITICAL', 'MongoDB bağlantısı başarısız oldu', error);
  process.exit(1);
}

// Temel route
app.use('/', require('./routes/index'));
// Sistem sağlık durumu API
app.use('/api/health', require('./routes/health'));
// Kimlik doğrulama
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
// Güvenli kimlik bilgileri
app.use('/api/credentials', require('./routes/credentials'));
app.use('/api/servers', require('./routes/servers'));
// Kullanıcı yönetimi
app.use('/api/users', require('./routes/users'));
// Dashboard
app.use('/api/dashboard', require('./routes/dashboard'));
// Bildirim sistemi
app.use('/api/notifications', require('./routes/notifications'));
// Denetim günlüğü
app.use('/api/audit', require('./routes/audit'));
// Lokasyon yönetimi
app.use('/api/locations', require('./routes/locations'));

// Swagger setup
try {
  const swaggerDocument = YAML.load('swagger.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  logError('WARNING', 'Swagger dosyası bulunamadı, API dokümantasyonu devre dışı', error);
}

// Hata yönetimi
app.use(errorHandler);

// Bildirim ve bakım görevleri
require('./utils/scheduler');

// 404 handler - tüm route'lardan sonra
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'İstenilen sayfa bulunamadı'
  });
});

module.exports = app;