const User = require('../models/User');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { logError } = require('../../../utils/errorLogger');

// Bildirim modeli tanımı
const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'SYSTEM'],
    default: 'INFO'
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  recipientRoles: [{
    type: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedResource: {
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    resourceName: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

/**
 * Bildirim gönderme fonksiyonu
 * @param {Object} notification - Bildirim verisi
 */
const sendNotification = async (notification) => {
  try {
    if (!notification.title || !notification.message) {
      throw new Error('Bildirim için başlık ve mesaj gereklidir');
    }

    // Alıcılar veya alıcı roller kontrol et
    if (!notification.recipients?.length && !notification.recipientRoles?.length) {
      throw new Error('En az bir alıcı veya alıcı rol belirtilmelidir');
    }

    let recipients = notification.recipients || [];

    // Eğer roller belirtilmişse, ilgili kullanıcıları bul
    if (notification.recipientRoles?.length) {
      const usersByRoles = await User.find({
        'roles.name': { $in: notification.recipientRoles },
        isActive: true
      }).select('_id');

      recipients = [...new Set([
        ...recipients, 
        ...usersByRoles.map(user => user._id)
      ])];
    }

    // Bildirim oluştur
    const newNotification = new Notification({
      title: notification.title,
      message: notification.message,
      type: notification.type || 'INFO',
      recipients: recipients,
      recipientRoles: notification.recipientRoles || [],
      relatedResource: notification.relatedResource,
      createdBy: notification.createdBy,
      expiresAt: notification.expiresAt
    });

    await newNotification.save();
    
    // Gerçek zamanlı bildirim gönderimi (Socket.IO, Push API vb.) buraya eklenebilir
    
    return newNotification;
  } catch (error) {
    logError('Bildirim gönderme hatası utils/notifications.js içinde', error, {
      notificationType: notification?.type,
      userId: notification?.createdBy // createdBy daha uygun olabilir
    });
    // throw error; // Hatanın yukarıya iletilip iletilmeyeceğine karar verilmeli
  }
};

const getUserNotifications = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10, onlyUnread = true, type } = options;
    const skip = (page - 1) * limit;

    const filter = {
      recipients: ObjectId(userId)
    };

    if (onlyUnread) {
      filter['readBy.user'] = { $ne: ObjectId(userId) };
    }

    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username firstName lastName');

    const total = await Notification.countDocuments(filter);

    return {
      notifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    };
  } catch (error) {
    logError('Kullanıcı bildirimleri getirme hatası:', error, { userId, options });
    throw error;
  }
};

const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      throw new Error('Bildirim bulunamadı');
    }

    // Kullanıcı bu bildirimin alıcısı mı kontrol et
    if (!notification.recipients.some(recipient => recipient.toString() === userId)) {
      throw new Error('Bu bildirimi işaretleme yetkiniz yok');
    }

    // Kullanıcı bildirimi zaten okuduysa, işlemi atla
    const alreadyRead = notification.readBy.some(item => item.user.toString() === userId);
    if (alreadyRead) {
      return notification;
    }

    // Okundu olarak işaretle
    notification.readBy.push({
      user: userId,
      readAt: new Date()
    });

    // Tüm alıcılar okuduysa, genel olarak okundu işaretle
    if (notification.readBy.length === notification.recipients.length) {
      notification.isRead = true;
    }

    await notification.save();
    return notification;
  } catch (error) {
    logError('Bildirim okundu işaretleme hatası:', error, { notificationId, userId });
    throw error;
  }
};

const sendSystemNotification = async (notification) => {
  try {
    // Tüm aktif kullanıcıları bul
    const users = await User.find({ isActive: true }).select('_id');
    
    const systemNotification = {
      ...notification,
      type: 'SYSTEM',
      recipients: users.map(user => user._id)
    };
    
    return await sendNotification(systemNotification);
  } catch (error) {
    logError('Sistem bildirimi gönderme hatası:', error, { notificationTitle: notification?.title });
    throw error;
  }
};

module.exports = {
  Notification,
  sendNotification,
  getUserNotifications,
  markAsRead,
  sendSystemNotification
};
