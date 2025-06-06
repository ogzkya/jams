/**
 * Gelişmiş güvenlik middleware'leri
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
let mongoSanitize;

// Eksik bağımlılıklar için kontrol
try {
  mongoSanitize = require('express-mongo-sanitize');
} catch (err) {
  console.warn('⚠️ express-mongo-sanitize paketi bulunamadı, NoSQL Injection koruması devre dışı. Yüklemek için: npm install express-mongo-sanitize'); // Geçici olarak console.warn
  // Mock fonksiyon oluştur
  mongoSanitize = () => (req, res, next) => next();
}

// xss ve hpp kontrolü
let xss, hpp;
try {
  xss = require('xss-clean');
  hpp = require('hpp');
} catch (err) {
  console.warn('⚠️ xss-clean veya hpp paketleri bulunamadı. Yüklemek için: npm install xss-clean hpp'); // Geçici olarak console.warn
  xss = () => (req, res, next) => next();
  hpp = () => (req, res, next) => next();
}

// Rate limit ayarları
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin'
    },
    handler: (req, res, next, options) => {
      try {
        const { logWarning } = require('../../../utils/errorLogger'); // Burada içe aktarılıyor
        logWarning('Rate limit aşıldı', {
          ip: req.ip,
          path: req.originalUrl,
          method: req.method
        });
      } catch (err) {
        // logWarning'in kendisi hata verirse diye fallback
        console.warn('Rate limit aşıldı (loglama sırasında hata):', req.ip, req.originalUrl, err.message);
      }
      res.status(options.statusCode).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Auth istekleri için daha sıkı rate limit
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 dakika
  10, // 10 istek
  'Çok fazla giriş denemesi yaptınız, lütfen 15 dakika sonra tekrar deneyin'
);

// Güvenlik başlıkları ayarları
const securityHeaders = (app) => {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }));
};

// Veri güvenliği
const dataSanitization = (app) => {
  app.use(mongoSanitize({
    onSanitize: ({ req, key }) => {
      try {
        const { logWarning } = require('../../../utils/errorLogger'); // Burada içe aktarılıyor
        logWarning('NoSQL injection denemesi algılandı', {
          ip: req.ip,
          path: req.originalUrl,
          key
        });
      } catch (err) {
        console.warn('NoSQL injection denemesi algılandı (loglama sırasında hata):', req.ip, req.originalUrl, key, err.message);
      }
    }
  }));
  
  // XSS koruması
  app.use(xss());
  
  // HTTP Parameter Pollution koruması
  app.use(hpp({
    whitelist: [
      'name', 'type', 'category', 'status', 'location', 
      'assignedTo', 'brand', 'model', 'serialNumber'
    ]
  }));
};

// IP güvenlik kontrolü
const ipFilter = (req, res, next) => {
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
  const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
  
  const clientIP = req.ip;
  
  // IP engelleme listesinde varsa erişim reddet
  if (blockedIPs.length > 0 && blockedIPs.includes(clientIP)) {
    try {
      const { logWarning } = require('../../../utils/errorLogger'); // Burada içe aktarılıyor
      logWarning('Engellenmiş IP erişim denemesi', {
        ip: clientIP,
        path: req.originalUrl,
        method: req.method
      });
    } catch (err) {
      console.warn('Engellenmiş IP erişim denemesi (loglama sırasında hata):', clientIP, req.originalUrl, err.message);
    }
    return res.status(403).json({
      success: false,
      message: 'Erişim engellendi'
    });
  }
  
  // Beyaz liste aktifse ve IP listede değilse erişim reddet
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    try {
      const { logWarning } = require('../../../utils/errorLogger'); // Burada içe aktarılıyor
      logWarning('İzin verilmeyen IP erişim denemesi', {
        ip: clientIP,
        path: req.originalUrl,
        method: req.method
      });
    } catch (err) {
      console.warn('İzin verilmeyen IP erişim denemesi (loglama sırasında hata):', clientIP, req.originalUrl, err.message);
    }
    return res.status(403).json({
      success: false,
      message: 'Erişim engellendi'
    });
  }
  
  next();
};

// Tüm güvenlik middleware'lerini uygula
const applySecurityMiddleware = (app) => {
  try {
    securityHeaders(app);
    dataSanitization(app);
    
    // IP filtreleme
    if (process.env.ENABLE_IP_FILTER === 'true') {
      app.use(ipFilter);
    }
    
    // Rate limit'ler
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/forgot-password', authLimiter);
    
    // Genel rate limit
    app.use('/api/', createRateLimiter(
      60 * 1000, // 1 dakika
      100, // 100 istek
      'Çok fazla istek gönderdiniz, lütfen bir dakika sonra tekrar deneyin'
    ));
    
    console.log('✅ Güvenlik middleware\'leri başarıyla uygulandı');
  } catch (error) {
    console.error('❌ Güvenlik middleware\'leri uygulanırken hata:', error.message); // Geçici olarak console.error
    console.warn('⚠️ Sistemi minimum güvenlik ayarları ile başlatmaya devam edilecek'); // Geçici olarak console.warn
  }
};

module.exports = {
  applySecurityMiddleware,
  authLimiter,
  createRateLimiter,
  securityHeaders,
  dataSanitization,
  ipFilter,
  // logWarning, logError'ı burada export etmeye gerek yok, doğrudan errorLogger'dan kullanılır.
};

/* Dosyanın en üstüne eklenecek importlar (security.js için):
const { logError, logWarning } = require('../../../utils/errorLogger');
*/
