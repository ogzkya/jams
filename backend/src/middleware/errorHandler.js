const { validationResult } = require('express-validator');
const AuditLog = require('../models/AuditLog');

/**
 * Validation sonuçlarını kontrol eden middleware
 */
const handleValidationErrors = async (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Validation hatalarını audit log'a kaydet
    if (req.user) {
      await AuditLog.logFailure({
        action: 'VALIDATION_ERROR',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: req.originalUrl },
        details: { 
          description: 'Validation hatası',
          metadata: { errors: errors.array() }
        },
        category: 'DATA_CHANGE',
        severity: 'LOW'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Giriş verileri geçersiz',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Genel hata yakalama middleware'i
 */
const errorHandler = async (err, req, res, next) => {
  console.error('Error:', err);

  // Audit log'a hata kaydı
  try {
    await AuditLog.logError({
      action: 'SYSTEM_ERROR',
      user: req.user ? req.user._id : null,
      username: req.user ? req.user.username : 'Anonymous',
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'SYSTEM', name: req.originalUrl },
      details: { 
        description: 'Sistem hatası',
        metadata: { 
          errorMessage: err.message,
          errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
      },
      category: 'SYSTEM_ACCESS',
      severity: 'HIGH'
    });
  } catch (logError) {
    console.error('Audit log error:', logError);
  }

  // MongoDB duplicate key hatası
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} zaten kullanımda`,
      field: field
    });
  }

  // MongoDB validation hatası
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Veri doğrulama hatası',
      errors: errors
    });
  }

  // JWT hatası
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token süresi dolmuş'
    });
  }

  // Cast hatası (geçersiz ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Geçersiz ID formatı'
    });
  }

  // Varsayılan hata
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Sunucu hatası';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 Not Found middleware'i
 */
const notFound = (req, res, next) => {
  const error = new Error(`Bulunamadı - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  handleValidationErrors,
  errorHandler,
  notFound
};
