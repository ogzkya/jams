const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const {
  Notification,
  sendNotification,
  getUserNotifications,
  markAsRead,
  sendSystemNotification
} = require('../utils/notifications');
const { logError } = require('../../../utils/errorLogger'); // errorLogger'ı içe aktar

// Middleware - Tüm bildirim rotalarına kimlik doğrulama uygula
router.use(authenticateToken);

/**
 * @route   GET /api/notifications
 * @desc    Kullanıcının bildirimlerini listele
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      onlyUnread: req.query.onlyUnread !== 'false',
      type: req.query.type
    };

    const result = await getUserNotifications(req.user._id, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Bildirim getirme hatası (route):', error, { userId: req.user?._id, query: req.query });
    res.status(500).json({
      success: false,
      message: 'Bildirimler getirilemedi'
    });
  }
});

/**
 * @route   GET /api/notifications/count
 * @desc    Okunmamış bildirim sayısını getir
 * @access  Private
 */
router.get('/count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipients: req.user._id,
      'readBy.user': { $ne: req.user._id }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logError('Bildirim sayısı hatası (route):', error, { userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Bildirim sayısı getirilemedi'
    });
  }
});

/**
 * @route   POST /api/notifications
 * @desc    Yeni bildirim oluştur
 * @access  Private (NOTIFICATION_CREATE yetkisi gerekli)
 */
router.post('/', requirePermission('NOTIFICATION_CREATE'), async (req, res) => {
  try {
    const notification = {
      ...req.body,
      createdBy: req.user._id
    };

    const newNotification = await sendNotification(notification);

    res.status(201).json({
      success: true,
      message: 'Bildirim başarıyla gönderildi',
      data: { notification: newNotification }
    });
  } catch (error) {
    logError('Bildirim oluşturma hatası (route):', error, { userId: req.user?._id, body: req.body });
    res.status(500).json({
      success: false,
      message: error.message || 'Bildirim oluşturulamadı'
    });
  }
});

/**
 * @route   POST /api/notifications/system
 * @desc    Sistem bildirimi gönder (tüm kullanıcılara)
 * @access  Private (ADMIN yetkisi gerekli)
 */
router.post('/system', requirePermission('NOTIFICATION_SYSTEM'), async (req, res) => {
  try {
    const notification = {
      ...req.body,
      createdBy: req.user._id
    };

    const systemNotification = await sendSystemNotification(notification);

    res.status(201).json({
      success: true,
      message: 'Sistem bildirimi başarıyla gönderildi',
      data: { notification: systemNotification }
    });
  } catch (error) {
    logError('Sistem bildirimi hatası (route):', error, { userId: req.user?._id, body: req.body });
    res.status(500).json({
      success: false,
      message: error.message || 'Sistem bildirimi gönderilemedi'
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Bildirimi okundu olarak işaretle
 * @access  Private
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);

    res.json({
      success: true,
      message: 'Bildirim okundu olarak işaretlendi',
      data: { notification }
    });
  } catch (error) {
    logError('Bildirim okuma hatası (route):', error, { userId: req.user?._id, notificationId: req.params.id });
    res.status(500).json({
      success: false,
      message: error.message || 'Bildirim okundu olarak işaretlenemedi'
    });
  }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Tüm bildirimleri okundu olarak işaretle
 * @access  Private
 */
router.put('/read-all', async (req, res) => {
  try {
    // Kullanıcının okunmamış bildirimlerini bul
    const unreadNotifications = await Notification.find({
      recipients: req.user._id,
      'readBy.user': { $ne: req.user._id }
    });

    // Her bir bildirimi okundu olarak işaretle
    const markPromises = unreadNotifications.map(notification => 
      markAsRead(notification._id, req.user._id)
    );
    
    await Promise.all(markPromises);

    res.json({
      success: true,
      message: 'Tüm bildirimler okundu olarak işaretlendi',
      data: { count: unreadNotifications.length }
    });
  } catch (error) {
    logError('Toplu bildirim okuma hatası (route):', error, { userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Bildirimler okundu olarak işaretlenemedi'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Bildirimi sil
 * @access  Private (Kendi bildirimi veya ADMIN/MANAGER)
 */
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı'
      });
    }

    // Silme yetkisi kontrolü
    const isAdmin = req.user.roles.some(r => ['ADMIN', 'MANAGER'].includes(r));
    const isRecipient = notification.recipients.some(r => r.toString() === req.user._id.toString());
    const isCreator = notification.createdBy && notification.createdBy.toString() === req.user._id.toString();
    
    if (!isRecipient && !isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Bu bildirimi silme yetkiniz yok'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bildirim başarıyla silindi'
    });
  } catch (error) {
    logError('Bildirim silme hatası (route):', error, { userId: req.user?._id, notificationId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Bildirim silinemedi'
    });
  }
});

module.exports = router;
