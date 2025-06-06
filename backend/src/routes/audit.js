const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { checkRole } = require('../middleware/rbacMiddleware');

// Audit log route'ları
// Tüm audit route'ları için kimlik doğrulama gerekli
router.use(authenticateToken);

/**
 * @route   GET /api/audit
 * @desc    Audit loglarını listele (filtreleme ve sayfalama ile)
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogs
);

/**
 * @route   GET /api/audit/:id
 * @desc    Belirli bir audit log kaydını getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/:id', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogById
);

/**
 * @route   GET /api/audit/user/:userId
 * @desc    Belirli bir kullanıcının audit loglarını getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/user/:userId', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByUser
);

/**
 * @route   GET /api/audit/action/:action
 * @desc    Belirli bir aksiyon türüne ait audit logları getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/action/:action', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByAction
);

/**
 * @route   GET /api/audit/resource/:resource
 * @desc    Belirli bir kaynak türüne ait audit logları getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/resource/:resource', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByResource
);

/**
 * @route   GET /api/audit/date-range
 * @desc    Belirli tarih aralığındaki audit logları getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/date-range', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByDateRange
);

/**
 * @route   GET /api/audit/security-events
 * @desc    Güvenlik olaylarını getir (başarısız giriş, hesap kilitleme vs.)
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/security-events', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getSecurityEvents
);

/**
 * @route   GET /api/audit/statistics
 * @desc    Audit log istatistiklerini getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/statistics', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditStatistics
);

/**
 * @route   GET /api/audit/user-activity/:userId
 * @desc    Kullanıcı aktivite raporunu getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/user-activity/:userId', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getUserActivityReport
);

/**
 * @route   GET /api/audit/system-activity
 * @desc    Sistem aktivite raporunu getir
 * @access  AUDIT_VIEW yetkisi gerekli - yalnızca admin
 */
router.get('/system-activity', 
  checkRole(['ADMIN', 'SYSTEM_ADMIN']),
  requirePermission('AUDIT_VIEW'), 
  auditController.getSystemActivityReport
);

/**
 * @route   POST /api/audit/search
 * @desc    Gelişmiş arama ile audit logları filtrele
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.post('/search', 
  requirePermission('AUDIT_VIEW'), 
  auditController.searchAuditLogs
);

/**
 * @route   GET /api/audit/export
 * @desc    Audit logları dışa aktar (CSV/Excel)
 * @access  AUDIT_EXPORT yetkisi gerekli
 */
router.get('/export', 
  requirePermission('AUDIT_EXPORT'), 
  auditController.exportAuditLogs
);

/**
 * @route   DELETE /api/audit/cleanup
 * @desc    Eski audit logları temizle (retention policy'ye göre)
 * @access  AUDIT_DELETE yetkisi gerekli - yalnızca sistem admin
 */
router.delete('/cleanup', 
  checkRole(['ADMIN', 'SYSTEM_ADMIN']),
  requirePermission('AUDIT_DELETE'), 
  auditController.cleanupOldLogs
);

/**
 * @route   GET /api/audit/dashboard
 * @desc    Audit dashboard verilerini getir
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/dashboard', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getDashboardData
);

/**
 * @route   GET /api/audit/real-time
 * @desc    Gerçek zamanlı audit olayları için WebSocket endpoint
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/real-time', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getRealTimeEvents
);

module.exports = router;
