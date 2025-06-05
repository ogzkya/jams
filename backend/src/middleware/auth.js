const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * JWT token doğrulama middleware'i
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      await AuditLog.logFailure({
        action: 'USER_ACCESS_DENIED',
        username: 'Anonymous',
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: req.originalUrl },
        details: { description: 'Token bulunamadı' },
        category: 'AUTHENTICATION',
        severity: 'MEDIUM'
      });

      return res.status(401).json({
        success: false,
        message: 'Erişim token\'ı gereklidir'
      });
    }

    // Token doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcıyı veritabanından getir
    const user = await User.findById(decoded.userId)
      .populate('roles')
      .select('-password');

    if (!user) {
      await AuditLog.logFailure({
        action: 'USER_ACCESS_DENIED',
        username: decoded.username || 'Unknown',
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: req.originalUrl },
        details: { description: 'Kullanıcı bulunamadı' },
        category: 'AUTHENTICATION',
        severity: 'HIGH'
      });

      return res.status(401).json({
        success: false,
        message: 'Geçersiz token - kullanıcı bulunamadı'
      });
    }

    // Kullanıcının aktif olup olmadığını kontrol et
    if (!user.isActive) {
      await AuditLog.logFailure({
        action: 'USER_ACCESS_DENIED',
        user: user._id,
        username: user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: req.originalUrl },
        details: { description: 'Pasif kullanıcı erişim denemesi' },
        category: 'AUTHENTICATION',
        severity: 'HIGH'
      });

      return res.status(401).json({
        success: false,
        message: 'Hesap aktif değil'
      });
    }

    // Hesap kilitli mi kontrol et
    if (user.isLocked) {
      await AuditLog.logFailure({
        action: 'USER_ACCESS_DENIED',
        user: user._id,
        username: user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: req.originalUrl },
        details: { description: 'Kilitli hesap erişim denemesi' },
        category: 'AUTHENTICATION',
        severity: 'HIGH'
      });

      return res.status(401).json({
        success: false,
        message: 'Hesap kilitli - yönetici ile iletişime geçin'
      });
    }

    // Kullanıcı bilgilerini request'e ekle
    req.user = user;
    next();

  } catch (error) {
    await AuditLog.logError({
      action: 'USER_ACCESS_ERROR',
      username: 'Unknown',
      userIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      resource: { type: 'SYSTEM', name: req.originalUrl },
      details: { 
        description: 'Token doğrulama hatası',
        metadata: { errorMessage: error.message }
      },
      category: 'AUTHENTICATION',
      severity: 'MEDIUM'
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token süresi dolmuş'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Token doğrulama hatası'
      });
    }
  }
};

/**
 * İsteğe bağlı token doğrulama (genel erişim için)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .populate('roles')
        .select('-password');

      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // İsteğe bağlı doğrulamada hata alınsa bile devam et
    next();
  }
};

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } else {
    res.status(401);
    throw new Error('Yetkilendirme hatası, token bulunamadı');
  }
});

/**
 * Rol tabanlı yetkilendirme middleware'i
 */
const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Erişim reddedildi - kimlik doğrulaması gerekli'
      });
    }

    // Kullanıcının rollerini kontrol et
    const userRoles = req.user.roles?.map(role => role.name) || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      await AuditLog.logFailure({
        action: 'USER_ACCESS_DENIED',
        user: req.user._id,
        username: req.user.username,
        userIP: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        resource: { type: 'SYSTEM', name: req.originalUrl },
        details: { 
          description: 'Yetersiz yetki',
          metadata: { 
            requiredRoles: roles,
            userRoles: userRoles
          }
        },
        category: 'AUTHORIZATION',
        severity: 'MEDIUM'
      });

      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmuyor'
      });
    }

    next();
  });
};

module.exports = {
  authenticateToken,
  optionalAuth,
  protect,
  authorize
};
