const { validationResult } = require('express-validator');
const { logError: centralLogError } = require('../../../utils/errorLogger'); // errorLogger'ı içe aktar ve yeniden adlandır
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
const errorHandler = (err, req, res, next) => {
  centralLogError('Global Error Handler Yakaladı:', err, {
    path: req.path,
    method: req.method,
    user: req.user ? { id: req.user.id, username: req.user.username } : null,
    statusCode: res.statusCode !== 200 ? res.statusCode : 500
  });

  try {
    if (require('../models/AuditLog')) { // Bu kontrol kalabilir
      const AuditLog = require('../models/AuditLog');
      AuditLog.create({
        user: user ? user.id : null,
        action: 'ERROR',
        resource: 'System',
        details: {
          error: err.message,
          path: req.path,
          method: req.method,
          stack: process.env.NODE_ENV === 'production' ? null : err.stack
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH'
      }).catch(logErr => centralLogError('Audit log oluşturma hatası (errorHandler içinde):', logErr));
    }
  } catch (auditCatchError) {
    centralLogError('AuditLog modeli yüklenirken veya kullanılırken hata (errorHandler içinde):', auditCatchError);
  }
  
  // HTTP status code
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  // Response
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    error: {
      code: err.code || 'SERVER_ERROR',
      type: err.name || 'Error'
    }
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
