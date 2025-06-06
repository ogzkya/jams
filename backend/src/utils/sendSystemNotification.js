const Notification = require('../models/Notification');
const { logError } = require('../../../utils/errorLogger');

/**
 * Sistem bildirimlerini oluştur ve yolla
 * @param {Object} notificationData - Bildirim verileri
 * @returns {Promise<Object>} - Oluşturulan bildirim
 */
async function sendSystemNotification(notificationData) {
  try {
    // Bildirimi oluştur
    const notification = new Notification({
      title: notificationData.title,
      message: notificationData.message,
      type: 'SYSTEM',
      priority: notificationData.priority || 'MEDIUM',
      recipientRoles: notificationData.recipientRoles || ['ADMIN'],
      relatedResource: notificationData.relatedResource,
      expiresAt: notificationData.expiresAt || null,
      sender: 'SYSTEM'
    });

    // Bildirimi kaydet
    await notification.save();
    
    console.log(`Sistem bildirimi gönderildi: ${notification.title}`);
    return notification;
  } catch (error) {
    logError('ERROR', 'Sistem bildirimi gönderme hatası', error, { 
      notificationType: notificationData?.type,
      targetUsers: notificationData?.targetUsers?.length 
    });
  }
}

module.exports = sendSystemNotification;
