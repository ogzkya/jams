const express = require('express');
const router = express.Router();
const { 
  getLocations, 
  getLocation, 
  createLocation, 
  updateLocation, 
  deleteLocation, 
  uploadFloorPlan, 
  getLocationDevices, 
  getLocationStats 
} = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { locationValidations, commonValidations } = require('../utils/validation');
const { handleValidationErrors } = require('../middleware/errorHandler');

/**
 * Lokasyon yönetimi rotaları
 */

// Tüm lokasyonları listele - LOCATION_VIEW yetkisi gerekli
router.get('/',
  authenticateToken,
  requirePermission('LOCATION_VIEW'),
  getLocations
);

// Lokasyon istatistikleri - LOCATION_VIEW yetkisi gerekli
router.get('/stats',
  authenticateToken,
  requirePermission('LOCATION_VIEW'),
  getLocationStats
);

// Belirli bir lokasyonu getir - LOCATION_VIEW yetkisi gerekli
router.get('/:id',
  authenticateToken,
  requirePermission('LOCATION_VIEW'),
  commonValidations.mongoId,
  handleValidationErrors,
  getLocation
);

// Lokasyondaki cihazları listele - LOCATION_VIEW yetkisi gerekli
router.get('/:id/devices',
  authenticateToken,
  requirePermission('LOCATION_VIEW'),
  commonValidations.mongoId,
  handleValidationErrors,
  getLocationDevices
);

// Yeni lokasyon oluştur - LOCATION_CREATE yetkisi gerekli
router.post('/',
  authenticateToken,
  requirePermission('LOCATION_CREATE'),
  locationValidations.create,
  handleValidationErrors,
  createLocation
);

// Lokasyon güncelle - LOCATION_UPDATE yetkisi gerekli
router.put('/:id',
  authenticateToken,
  requirePermission('LOCATION_UPDATE'),
  commonValidations.mongoId,
  handleValidationErrors,
  updateLocation
);

// Lokasyon sil (soft delete) - LOCATION_DELETE yetkisi gerekli
router.delete('/:id',
  authenticateToken,
  requirePermission('LOCATION_DELETE'),
  commonValidations.mongoId,
  handleValidationErrors,
  deleteLocation
);

// Kat planı yükle/güncelle - LOCATION_UPDATE yetkisi gerekli
router.post('/:id/floor-plan',
  authenticateToken,
  requirePermission('LOCATION_UPDATE'),
  commonValidations.mongoId,
  handleValidationErrors,
  uploadFloorPlan
);

module.exports = router;
