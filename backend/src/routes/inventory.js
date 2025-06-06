const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/auth');
const Location = require('../models/Location');
const Device = require('../models/Device');
const { logAuditEvent } = require('../utils/auditHelper');
const router = express.Router();
const { 
  getDevices, 
  getDevice, 
  createDevice, 
  updateDevice, 
  deleteDevice, 
  assignDevice, 
  moveDevice, 
  scanQRCode, 
  getDeviceStats 
} = require('../controllers/inventoryController');

/**
 * Envanter yönetimi rotaları
 */

// Tüm cihazları listele
router.get('/',
  protect,
  getDevices
);

// Cihaz istatistikleri
router.get('/stats',
  protect,
  getDeviceStats
);

// QR kod tarama
router.post('/scan',
  protect,
  scanQRCode
);

// Belirli bir cihazı getir
router.get('/:id',
  protect,
  getDevice
);

// Yeni cihaz oluştur
router.post('/',
  protect,
  createDevice
);

// Cihaz güncelle
router.put('/:id',
  protect,
  updateDevice
);

// Cihaz sil (soft delete)
router.delete('/:id',
  protect,
  deleteDevice
);

// Cihaz ata/atamasını kaldır
router.post('/:id/assign',
  protect,
  assignDevice
);

// Cihaz taşı
router.post('/:id/move',
  protect,
  moveDevice
);

// CREATE Location
router.post('/locations', protect, authorize('Admin','SistemYonetici'), asyncHandler(async (req, res) => {
  const loc = await Location.create(req.body);
  
  await logAuditEvent(
    req.user._id,
    'create',
    'Location',
    loc._id,
    { locationName: loc.name },
    req
  );
  
  res.status(201).json(loc);
}));

// LIST Locations
router.get('/locations', protect, asyncHandler(async (req, res) => {
  const list = await Location.find().populate('parent');
  res.status(200).json({
    success: true,
    data: { locations: list }
  });
}));

// CREATE Device
router.post('/devices', protect, authorize('Admin','TeknikDestek','DepartmanYonetici'), asyncHandler(async (req, res) => {
  const dev = await Device.create(req.body);
  await AuditLog.create({ user: req.user._id, action:'create', resourceType:'Device', resourceId: dev._id, ip:req.ip });
  res.status(201).json(dev);
}));

// LIST Devices
router.get('/devices', protect, asyncHandler(async (req, res) => {
  const list = await Device.find().populate('location').populate('assignedTo','name email');
  res.json(list);
}));

module.exports = router;
