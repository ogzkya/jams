require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();

// Nginx ters proxy arkasındaysanız client IP’lerini doğru almak için
// app.set('trust proxy', 1); // lokal geliştirme için kapalı

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS.split(',') }));
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS),
  max: Number(process.env.RATE_LIMIT_MAX)
}));

// MongoDB bağlantısı
connectDB();

// Temel route
app.use('/', require('./routes/index'));
// Yeni: Kimlik doğrulama
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
// Yeni: güvenli kimlik bilgileri
app.use('/api/credentials', require('./routes/credentials'));
app.use('/api/servers', require('./routes/servers'));
// Yeni: Kullanıcı yönetimi
app.use('/api/users', require('./routes/users'));
// Dashboard
app.use('/api/dashboard', require('./routes/dashboard'));

// Swagger setup
try {
  const swaggerDocument = YAML.load('swagger.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.log('Swagger dosyası bulunamadı, API dokümantasyonu devre dışı');
}

// Hata yönetimi
app.use(errorHandler);

// Bildirim ve bakım görevleri
// require('./utils/scheduler');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));