const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

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
 * @desc    Belirli bir aksiyon türüne ait audit logları
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/action/:action', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByAction
);

/**
 * @route   GET /api/audit/resource/:resourceType
 * @desc    Belirli bir kaynak türüne ait audit logları
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/resource/:resourceType', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByResource
);

/**
 * @route   GET /api/audit/category/:category
 * @desc    Belirli bir kategoriye ait audit logları
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/category/:category', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditLogsByCategory
);

/**
 * @route   GET /api/audit/stats/overview
 * @desc    Audit log istatistikleri
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/stats/overview', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getAuditStats
);

/**
 * @route   GET /api/audit/stats/user-activity
 * @desc    Kullanıcı aktivite istatistikleri
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/stats/user-activity', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getUserActivityStats
);

/**
 * @route   GET /api/audit/stats/system-events
 * @desc    Sistem olay istatistikleri
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/stats/system-events', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getSystemEventStats
);

/**
 * @route   GET /api/audit/reports/security
 * @desc    Güvenlik raporu
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/reports/security', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getSecurityReport
);

/**
 * @route   GET /api/audit/reports/user/:userId
 * @desc    Kullanıcı aktivite raporu
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/reports/user/:userId', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getUserReport
);

/**
 * @route   GET /api/audit/reports/system
 * @desc    Sistem raporu
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.get('/reports/system', 
  requirePermission('AUDIT_VIEW'), 
  auditController.getSystemReport
);

/**
 * @route   POST /api/audit/search
 * @desc    Audit log arama
 * @access  AUDIT_VIEW yetkisi gerekli
 */
router.post('/search', 
  requirePermission('AUDIT_VIEW'), 
  auditController.searchAuditLogs
);

/**
 * @route   POST /api/audit/export
 * @desc    Audit log dışa aktarma
 * @access  AUDIT_EXPORT yetkisi gerekli
 */
router.post('/export', 
  requirePermission('AUDIT_EXPORT'), 
  auditController.exportAuditLogs
);

/**
 * @route   DELETE /api/audit/cleanup
 * @desc    Eski audit loglarını temizle
 * @access  AUDIT_DELETE yetkisi gerekli
 */
router.delete('/cleanup', 
  requirePermission('AUDIT_DELETE'), 
  auditController.cleanupOldLogs
);

module.exports = router;
