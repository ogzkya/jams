const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Sunucu yönetimi route'ları
// Tüm sunucu route'ları için kimlik doğrulama gerekli
router.use(authenticateToken);

/**
 * @route   GET /api/servers
 * @desc    Tüm sunucuları listele
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/', 
  requirePermission('SERVER_VIEW'), 
  serverController.getAllServers
);

/**
 * @route   GET /api/servers/:id
 * @desc    Belirli bir sunucuyu getir
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/:id', 
  requirePermission('SERVER_VIEW'), 
  serverController.getServerById
);

/**
 * @route   POST /api/servers
 * @desc    Yeni sunucu ekle
 * @access  SERVER_CREATE yetkisi gerekli
 */
router.post('/', 
  requirePermission('SERVER_CREATE'), 
  serverController.createServer
);

/**
 * @route   PUT /api/servers/:id
 * @desc    Sunucu bilgilerini güncelle
 * @access  SERVER_UPDATE yetkisi gerekli
 */
router.put('/:id', 
  requirePermission('SERVER_UPDATE'), 
  serverController.updateServer
);

/**
 * @route   DELETE /api/servers/:id
 * @desc    Sunucuyu sil
 * @access  SERVER_DELETE yetkisi gerekli
 */
router.delete('/:id', 
  requirePermission('SERVER_DELETE'), 
  serverController.deleteServer
);

/**
 * @route   POST /api/servers/:id/execute
 * @desc    Sunucuda komut çalıştır
 * @access  SERVER_EXECUTE yetkisi gerekli
 */
router.post('/:id/execute', 
  requirePermission('SERVER_EXECUTE'), 
  serverController.executeCommand
);

/**
 * @route   GET /api/servers/:id/status
 * @desc    Sunucu durumunu kontrol et
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/:id/status', 
  requirePermission('SERVER_VIEW'), 
  serverController.checkServerStatus
);

/**
 * @route   GET /api/servers/:id/performance
 * @desc    Sunucu performans bilgilerini getir
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/:id/performance', 
  requirePermission('SERVER_VIEW'), 
  serverController.getServerPerformance
);

/**
 * @route   POST /api/servers/:id/test-connection
 * @desc    Sunucu bağlantısını test et
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.post('/:id/test-connection', 
  requirePermission('SERVER_VIEW'), 
  serverController.testConnection
);

/**
 * @route   GET /api/servers/:id/logs
 * @desc    Sunucu loglarını getir
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/:id/logs', 
  requirePermission('SERVER_VIEW'), 
  serverController.getServerLogs
);

/**
 * @route   POST /api/servers/bulk-action
 * @desc    Toplu sunucu işlemleri
 * @access  SERVER_EXECUTE yetkisi gerekli
 */
router.post('/bulk-action', 
  requirePermission('SERVER_EXECUTE'), 
  serverController.bulkServerAction
);

/**
 * @route   GET /api/servers/stats/overview
 * @desc    Sunucu istatistikleri
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/stats/overview', 
  requirePermission('SERVER_VIEW'), 
  serverController.getServerStats
);

/**
 * @route   POST /api/servers/:id/health-check
 * @desc    Sunucu sağlık kontrolü
 * @access  SERVER_EXECUTE yetkisi gerekli
 */
router.post('/:id/health-check', 
  requirePermission('SERVER_EXECUTE'), 
  serverController.performHealthCheck
);

/**
 * @route   GET /api/servers/:id/monitoring
 * @desc    Sunucu izleme verileri
 * @access  SERVER_VIEW yetkisi gerekli
 */
router.get('/:id/monitoring', 
  requirePermission('SERVER_VIEW'), 
  serverController.getMonitoringData
);

module.exports = router;
