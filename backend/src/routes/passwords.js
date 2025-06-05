const express = require('express');
const router = express.Router();
const { 
  getPasswords, 
  getPassword, 
  createPassword, 
  updatePassword, 
  deletePassword, 
  sharePassword, 
  getPasswordStats 
} = require('../controllers/passwordController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { commonValidations } = require('../utils/validation');
const { handleValidationErrors } = require('../middleware/errorHandler');

/**
 * Şifre yönetimi rotaları
 */

// Tüm şifreleri listele - PASSWORD_VIEW yetkisi gerekli
router.get('/',
  authenticateToken,
  requirePermission('PASSWORD_VIEW'),
  getPasswords
);

// Şifre istatistikleri - PASSWORD_VIEW yetkisi gerekli
router.get('/stats',
  authenticateToken,
  requirePermission('PASSWORD_VIEW'),
  getPasswordStats
);

// Belirli bir şifreyi getir - PASSWORD_VIEW yetkisi gerekli
router.get('/:id',
  authenticateToken,
  requirePermission('PASSWORD_VIEW'),
  commonValidations.mongoId,
  handleValidationErrors,
  getPassword
);

// Yeni şifre oluştur - PASSWORD_CREATE yetkisi gerekli
router.post('/',
  authenticateToken,
  requirePermission('PASSWORD_CREATE'),
  createPassword
);

// Şifre güncelle - PASSWORD_UPDATE yetkisi gerekli
router.put('/:id',
  authenticateToken,
  requirePermission('PASSWORD_UPDATE'),
  commonValidations.mongoId,
  handleValidationErrors,
  updatePassword
);

// Şifre sil - PASSWORD_DELETE yetkisi gerekli
router.delete('/:id',
  authenticateToken,
  requirePermission('PASSWORD_DELETE'),
  commonValidations.mongoId,
  handleValidationErrors,
  deletePassword
);

// Şifre paylaş - PASSWORD_SHARE yetkisi gerekli
router.post('/:id/share',
  authenticateToken,
  requirePermission('PASSWORD_SHARE'),
  commonValidations.mongoId,
  handleValidationErrors,
  sharePassword
);

module.exports = router;
