const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/auth');
const Server = require('../models/Server');
const Credential = require('../models/Credential');
const Device = require('../models/Device');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Dashboard istatistikleri
router.get('/stats', protect, asyncHandler(async (req, res) => {
  try {
    const [servers, credentials, devices, users] = await Promise.all([
      Server.countDocuments(),
      Credential.countDocuments(),
      Device.countDocuments(),
      User.countDocuments()
    ]);

    res.json({
      servers,
      credentials,
      devices,
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'İstatistikler alınırken hata oluştu' });
  }
}));

// Son aktiviteler
router.get('/activity', protect, asyncHandler(async (req, res) => {
  try {
    const activities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'username')
      .lean();

    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      action: activity.action,
      user: activity.user?.username || 'System',
      timestamp: formatTimestamp(activity.timestamp)
    }));

    res.json(formattedActivities);
  } catch (error) {
    // Fallback data if AuditLog is not available
    res.json([
      { id: 1, action: 'Yeni sunucu eklendi', user: 'Admin', timestamp: '2 dakika önce' },
      { id: 2, action: 'Kimlik bilgisi güncellendi', user: 'User1', timestamp: '15 dakika önce' },
      { id: 3, action: 'Cihaz durumu değişti', user: 'System', timestamp: '1 saat önce' },
    ]);
  }
}));

// Sistem durumu
router.get('/status', protect, asyncHandler(async (req, res) => {
  try {
    // Bu gerçek bir sistem durumu kontrolü olabilir
    const systemStatus = [
      { name: 'Web Server', status: 'online', uptime: '99.9%' },
      { name: 'Database', status: 'online', uptime: '99.8%' },
      { name: 'Mail Service', status: 'warning', uptime: '95.2%' },
    ];

    res.json(systemStatus);
  } catch (error) {
    res.status(500).json({ message: 'Sistem durumu alınırken hata oluştu' });
  }
}));

// Yardımcı fonksiyon - zaman formatı
function formatTimestamp(timestamp) {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  return `${days} gün önce`;
}

module.exports = router;
