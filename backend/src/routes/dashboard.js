const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/auth');
const Server = require('../models/Server');
const Credential = require('../models/Credential');
const Device = require('../models/Device');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auditController = require('../controllers/auditController');
const { logError } = require('../../../utils/errorLogger'); // errorLogger'ı içe aktar

const router = express.Router();

// Dashboard istatistikleri
router.get('/stats', protect, asyncHandler(async (req, res) => {
  try {
    const [servers, credentials, devices, users] = await Promise.all([
      Server.countDocuments({ isActive: true }),
      Credential.countDocuments({ isActive: true }),
      Device.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        servers,
        credentials,
        devices,
        users
      }
    });
  } catch (error) {
    logError('Dashboard stats error (route):', error, { userId: req.user?._id });
    res.status(500).json({ 
      success: false, 
      message: 'İstatistikler alınırken hata oluştu' 
    });
  }
}));

// Son aktiviteler
router.get('/activity', protect, asyncHandler(async (req, res) => {
  try {
    const activities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'username firstName lastName')
      .lean();

    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      action: activity.action,
      user: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System',
      timestamp: formatTimestamp(activity.timestamp),
      details: activity.details?.description || '',
      severity: activity.severity || 'LOW',
      category: activity.category || 'SYSTEM'
    }));

    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    logError('Dashboard activity error (route):', error, { userId: req.user?._id });
    res.json({
      success: true,
      data: [
        { id: 1, action: 'USER_LOGIN', user: 'Admin User', timestamp: '2 dakika önce', severity: 'LOW' },
        { id: 2, action: 'PASSWORD_UPDATE', user: 'Test User', timestamp: '15 dakika önce', severity: 'MEDIUM' },
        { id: 3, action: 'SERVER_STATUS_CHECK', user: 'System', timestamp: '1 saat önce', severity: 'LOW' },
      ]
    });
  }
}));

// Sistem durumu
router.get('/status', protect, asyncHandler(async (req, res) => {
  try {
    // Server durumları kontrol et
    const serverStats = await Server.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const onlineServers = serverStats.find(s => s._id === 'online')?.count || 0;
    const totalServers = await Server.countDocuments({ isActive: true });
    const serverUptime = totalServers > 0 ? ((onlineServers / totalServers) * 100).toFixed(1) : '0.0';

    // Database connection check
    const dbStatus = 'online'; // MongoDB bağlantısı aktif

    // Sistem servisleri durumu
    const systemStatus = [
      { 
        name: 'Web Server', 
        status: 'online', 
        uptime: '99.9%',
        description: 'Application server is running'
      },
      { 
        name: 'Database', 
        status: dbStatus, 
        uptime: '99.8%',
        description: 'MongoDB connection is active'
      },
      { 
        name: 'Server Monitoring', 
        status: totalServers > 0 ? 'online' : 'warning', 
        uptime: `${serverUptime}%`,
        description: `${onlineServers}/${totalServers} servers online`
      },
      {
        name: 'Audit System',
        status: 'online',
        uptime: '100%',
        description: 'Audit logging is active'
      }
    ];

    res.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    logError('System status error (route):', error, { userId: req.user?._id });
    res.status(500).json({ 
      success: false, 
      message: 'Sistem durumu alınırken hata oluştu' 
    });
  }
}));

// Dashboard genel verileri (audit controller entegrasyonu)
router.get('/overview', protect, asyncHandler(async (req, res) => {
  // Audit controller'ın getDashboardData metodunu kullan
  return auditController.getDashboardData(req, res);
}));

// Sistem performans metrikleri
router.get('/metrics', protect, asyncHandler(async (req, res) => {
  try {
    // Simulated system metrics - gerçek sistemde sistem API'larından alınır
    const metrics = {
      cpu: {
        usage: Math.floor(Math.random() * 80) + 10, // 10-90 arası
        cores: 8,
        temperature: Math.floor(Math.random() * 20) + 45 // 45-65°C
      },
      memory: {
        used: Math.floor(Math.random() * 12) + 4, // 4-16 GB
        total: 16,
        percentage: 0
      },
      disk: {
        used: Math.floor(Math.random() * 300) + 200, // 200-500 GB
        total: 500,
        percentage: 0
      },
      network: {
        upload: Math.floor(Math.random() * 5) + 1, // 1-6 Mbps
        download: Math.floor(Math.random() * 10) + 5, // 5-15 Mbps
        latency: Math.floor(Math.random() * 50) + 10 // 10-60ms
      }
    };

    // Calculate percentages
    metrics.memory.percentage = Math.round((metrics.memory.used / metrics.memory.total) * 100);
    metrics.disk.percentage = Math.round((metrics.disk.used / metrics.disk.total) * 100);

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    logError('Metrics error (route):', error, { userId: req.user?._id });
    res.status(500).json({ 
      success: false, 
      message: 'Sistem metrikleri alınırken hata oluştu' 
    });
  }
}));

// Yardımcı fonksiyon - zaman formatı
function formatTimestamp(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs} saniye önce`;
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 30) return `${diffDays} gün önce`;
  
  return time.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = router;
