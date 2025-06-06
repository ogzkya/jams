const AuditLog = require('../models/AuditLog');
const { logError } = require('../../../utils/errorLogger');

/**
 * Audit olay logu oluştur
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} action - Gerçekleştirilen aksiyon
 * @param {String} resource - Etkilenen kaynak
 * @param {String} resourceId - Kaynak ID'si
 * @param {Object} details - Ek detaylar
 * @param {Object} req - Express request objesi
 */
async function logAuditEvent(userId, action, resource, resourceId = null, details = {}, req = null) {
  try {
    const auditData = {
      userId: userId || null,
      action,
      resource,
      resourceId,
      details,
      timestamp: new Date()
    };

    // Request bilgilerini ekle
    if (req) {
      auditData.ipAddress = getClientIP(req);
      auditData.userAgent = req.get('User-Agent') || '';
      auditData.method = req.method;
      auditData.endpoint = req.originalUrl;
      
      // Response time hesapla (eğer req.startTime varsa)
      if (req.startTime) {
        auditData.responseTime = Date.now() - req.startTime;
      }
    }

    // Severity seviyesini belirle
    auditData.severity = determineSeverity(action, resource, details);

    // Audit log kaydını oluştur
    const auditLog = new AuditLog(auditData);
    await auditLog.save();

    return auditLog;
  } catch (error) {
    logError('Audit log oluşturma hatası auditHelper içinde', error, {
      userId, action, resource, resourceId
    });
    // Audit log hatası sistem işleyişini durdurmamalı
  }
}

/**
 * Kullanıcının gerçek IP adresini al
 * @param {Object} req - Express request objesi
 * @returns {String} IP adresi
 */
function getClientIP(req) {
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         'unknown';
}

/**
 * Aksiyon ve kaynağa göre severity seviyesi belirle
 * @param {String} action - Aksiyon
 * @param {String} resource - Kaynak
 * @param {Object} details - Detaylar
 * @returns {String} Severity seviyesi
 */
function determineSeverity(action, resource, details) {
  // Kritik seviye olayları
  const criticalActions = [
    'ACCOUNT_LOCKED',
    'BRUTE_FORCE_ATTEMPT',
    'UNAUTHORIZED_ACCESS',
    'DATA_BREACH',
    'SYSTEM_COMPROMISE',
    'ADMIN_PRIVILEGE_ESCALATION'
  ];

  // Yüksek seviye olayları
  const highActions = [
    'LOGIN_FAILED',
    'PERMISSION_DENIED',
    'PASSWORD_CHANGE',
    'ROLE_CHANGE',
    'USER_DELETE',
    'DEVICE_DELETE',
    'LOCATION_DELETE',
    'SERVER_EXECUTE',
    'AUDIT_DELETE',
    'SYSTEM_CONFIG_CHANGE'
  ];

  // Orta seviye olayları
  const mediumActions = [
    'LOGIN_SUCCESS',
    'LOGOUT',
    'USER_CREATE',
    'USER_UPDATE',
    'DEVICE_CREATE',
    'DEVICE_UPDATE',
    'LOCATION_CREATE',
    'LOCATION_UPDATE',
    'PASSWORD_CREATE',
    'PASSWORD_UPDATE',
    'SERVER_CREATE',
    'SERVER_UPDATE'
  ];

  if (criticalActions.includes(action)) {
    return 'CRITICAL';
  } else if (highActions.includes(action)) {
    return 'HIGH';
  } else if (mediumActions.includes(action)) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Toplu audit log oluştur
 * @param {Array} events - Audit olayları listesi
 */
async function logBulkAuditEvents(events) {
  try {
    const auditLogs = events.map(event => ({
      ...event,
      timestamp: new Date(),
      severity: determineSeverity(event.action, event.resource, event.details)
    }));

    await AuditLog.insertMany(auditLogs);
    return auditLogs;
  } catch (error) {
    logError('Toplu audit log oluşturma hatası:', error, { eventCount: events?.length });
    return null;
  }
}

/**
 * Başarısız giriş denemesi logla
 * @param {String} identifier - Email veya kullanıcı adı
 * @param {Object} req - Request objesi
 */
async function logFailedLogin(identifier, req) {
  await logAuditEvent(
    null,
    'LOGIN_FAILED',
    'User',
    null,
    { 
      identifier,
      reason: 'Invalid credentials'
    },
    req
  );
}

/**
 * Başarılı giriş logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {Object} req - Request objesi
 */
async function logSuccessfulLogin(userId, req) {
  await logAuditEvent(
    userId,
    'LOGIN_SUCCESS',
    'User',
    userId,
    {
      loginTime: new Date()
    },
    req
  );
}

/**
 * Çıkış işlemi logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {Object} req - Request objesi
 */
async function logLogout(userId, req) {
  await logAuditEvent(
    userId,
    'LOGOUT',
    'User',
    userId,
    {
      logoutTime: new Date()
    },
    req
  );
}

/**
 * Hesap kilitleme logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} reason - Kilitleme sebebi
 * @param {Object} req - Request objesi
 */
async function logAccountLocked(userId, reason, req) {
  await logAuditEvent(
    userId,
    'ACCOUNT_LOCKED',
    'User',
    userId,
    {
      reason,
      lockTime: new Date()
    },
    req
  );
}

/**
 * Hesap kilit açma logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} unlockedBy - Kilidi açan kullanıcı ID'si
 * @param {Object} req - Request objesi
 */
async function logAccountUnlocked(userId, unlockedBy, req) {
  await logAuditEvent(
    unlockedBy,
    'ACCOUNT_UNLOCKED',
    'User',
    userId,
    {
      targetUserId: userId,
      unlockTime: new Date()
    },
    req
  );
}

/**
 * İzin reddedildi logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} resource - Erişilmeye çalışılan kaynak
 * @param {String} action - Gerçekleştirilmeye çalışılan aksiyon
 * @param {Object} req - Request objesi
 */
async function logPermissionDenied(userId, resource, action, req) {
  await logAuditEvent(
    userId,
    'PERMISSION_DENIED',
    resource,
    null,
    {
      attemptedAction: action,
      deniedTime: new Date()
    },
    req
  );
}

/**
 * Şifre değişikliği logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} changedBy - Şifreyi değiştiren kullanıcı ID'si
 * @param {Object} req - Request objesi
 */
async function logPasswordChange(userId, changedBy, req) {
  await logAuditEvent(
    changedBy,
    'PASSWORD_CHANGED',
    'User',
    userId,
    {
      targetUserId: userId,
      changeTime: new Date(),
      selfChange: userId === changedBy
    },
    req
  );
}

/**
 * Rol değişikliği logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} oldRole - Eski rol
 * @param {String} newRole - Yeni rol
 * @param {String} changedBy - Rolü değiştiren kullanıcı ID'si
 * @param {Object} req - Request objesi
 */
async function logRoleChange(userId, oldRole, newRole, changedBy, req) {
  await logAuditEvent(
    changedBy,
    'ROLE_CHANGE',
    'User',
    userId,
    {
      targetUserId: userId,
      oldRole,
      newRole,
      changeTime: new Date()
    },
    req
  );
}

/**
 * Sistem yapılandırma değişikliği logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} configType - Yapılandırma türü
 * @param {Object} changes - Değişiklik detayları
 * @param {Object} req - Request objesi
 */
async function logSystemConfigChange(userId, configType, changes, req) {
  await logAuditEvent(
    userId,
    'SYSTEM_CONFIG_CHANGE',
    'System',
    null,
    {
      configType,
      changes,
      changeTime: new Date()
    },
    req
  );
}

/**
 * Şüpheli aktivite logla
 * @param {String} userId - Kullanıcı ID'si
 * @param {String} activityType - Aktivite türü
 * @param {Object} details - Detaylar
 * @param {Object} req - Request objesi
 */
async function logSuspiciousActivity(userId, activityType, details, req) {
  await logAuditEvent(
    userId,
    'SUSPICIOUS_ACTIVITY',
    'Security',
    null,
    {
      activityType,
      ...details,
      detectionTime: new Date()
    },
    req
  );
}

/**
 * Brute force saldırısı logla
 * @param {String} identifier - Hedef identifier
 * @param {Number} attemptCount - Deneme sayısı
 * @param {Object} req - Request objesi
 */
async function logBruteForceAttempt(identifier, attemptCount, req) {
  try {
    await logAuditEvent(
      null,
      'BRUTE_FORCE_ATTEMPT',
      'Security',
      null,
      {
        identifier,
        attemptCount,
        detectionTime: new Date()
      },
      req
    );
  } catch (error) {
    logError('Brute force log hatası:', error, { identifier, attemptCount });
  }
}

module.exports = {
  logAuditEvent,
  logBulkAuditEvents,
  logFailedLogin,
  logSuccessfulLogin,
  logLogout,
  logAccountLocked,
  logAccountUnlocked,
  logPermissionDenied,
  logPasswordChange,
  logRoleChange,
  logSystemConfigChange,
  logSuspiciousActivity,
  logBruteForceAttempt,
  getClientIP,
  determineSeverity
};
