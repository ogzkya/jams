/**
 * Sistem Sağlık Durumu API Rotaları
 */
const express = require('express');
const router = express.Router();
const { getSystemStatus, checkDatabaseHealth, checkServicesAvailability } = require('../controllers/systemHealthController');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

/**
 * @route   GET /api/health
 * @desc    Temel sağlık durumu kontrolü - Kimlik doğrulama gerektirmez
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date()
  });
});

/**
 * @route   GET /api/health/system
 * @desc    Detaylı sistem durumu kontrolü
 * @access  Admin ve System Admin kullanıcıları
 */
router.get('/system', authenticateToken, requireRoles(['ADMIN', 'SYSTEM_ADMIN']), getSystemStatus);

/**
 * @route   GET /api/health/database
 * @desc    Veritabanı sağlık kontrolü
 * @access  Admin ve System Admin kullanıcıları
 */
router.get('/database', authenticateToken, requireRoles(['ADMIN', 'SYSTEM_ADMIN']), checkDatabaseHealth);

/**
 * @route   GET /api/health/services
 * @desc    Servis erişilebilirlik kontrolü
 * @access  Admin ve System Admin kullanıcıları
 */
router.get('/services', authenticateToken, requireRoles(['ADMIN', 'SYSTEM_ADMIN']), checkServicesAvailability);

/**
 * @route   POST /api/health/log-test
 * @desc    Test amaçlı log oluştur
 * @access  Admin
 */
router.post('/log-test', authenticateToken, requireRoles(['ADMIN']), (req, res) => {
  const { level = 'info', message = 'Test log' } = req.body;
  
  try {
    const { logError } = require('../../../utils/errorLogger');
    
    switch(level.toLowerCase()) {
      case 'info':
        logError('INFO', message, null, { source: 'log-test' });
        break;
      case 'warning':
        logError('WARNING', message, null, { source: 'log-test' });
        break;
      case 'error':
        logError('ERROR', message, new Error('Test error'), { source: 'log-test' });
        break;
      case 'critical':
        logError('CRITICAL', message, new Error('Test critical error'), { source: 'log-test' });
        break;
      default:
        logError('INFO', message, null, { source: 'log-test', level });
    }
    
    res.json({
      success: true,
      message: `${level} seviyesinde test logu oluşturuldu`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Log oluşturma hatası',
      error: error.message
    });
  }
});

module.exports = router;
