const cron = require('node-cron');
const { Notification } = require('./notifications');
const Device = require('../models/Device');
const Server = require('../models/Server');
const Location = require('../models/Location');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendSystemNotification } = require('./notifications');
const mongoose = require('mongoose');
const { logError } = require('../../../utils/errorLogger');

// Her gün gece yarısı çalışacak görev
cron.schedule('0 0 * * *', async () => {
  console.log('Günlük bakım görevleri çalıştırılıyor...');
  try {
    await cleanupExpiredNotifications();
    await checkWarrantyExpirations();
    await checkServerStatus();
    await generateDailyReport();
  } catch (error) {
    logError('Günlük bakım hatası', error, { task: 'daily_maintenance' });
  }
});

// Her saat başı çalışacak görev
cron.schedule('0 * * * *', async () => {
  console.log('Saatlik kontroller yapılıyor...');
  try {
    await checkDatabaseHealth();
  } catch (error) {
    logError('Saatlik kontrol hatası:', error, { task: 'hourly_checks' });
  }
});

// Her 15 dakikada bir çalışacak görev (kritik sunucu izleme)
cron.schedule('*/15 * * * *', async () => {
  console.log('Sunucu durumu kontrol ediliyor...');
  try {
    await monitorCriticalServers();
  } catch (error) {
    logError('Sunucu izleme hatası:', error, { task: 'critical_server_monitoring' });
  }
});

/**
 * Süresi dolmuş bildirimleri temizle
 */
async function cleanupExpiredNotifications() {
  try {
    const expiredNotifications = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`${expiredNotifications.deletedCount} süresi dolmuş bildirim temizlendi`);
  } catch (error) {
    logError('Bildirim temizleme hatası:', error, { function: 'cleanupExpiredNotifications' });
  }
}

/**
 * Garantisi yakında dolacak veya dolmuş cihazları kontrol et
 */
async function checkWarrantyExpirations() {
  try {
    // Garantisi 30 gün içinde dolacak cihazları bul
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringDevices = await Device.find({
      'procurement.warrantyEndDate': {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      },
      isActive: true
    });
    
    if (expiringDevices.length > 0) {
      await sendSystemNotification({
        title: 'Garanti Süresi Uyarısı',
        message: `${expiringDevices.length} cihazın garanti süresi 30 gün içinde dolacak.`,
        recipientRoles: ['ADMIN', 'INVENTORY_MANAGER'],
        relatedResource: {
          resourceType: 'Device',
          resourceName: 'Warranty Expiration'
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 gün sonra
      });
    }
  } catch (error) {
    logError('Garanti süresi kontrolü hatası:', error, { function: 'checkWarrantyExpirations' });
  }
}

/**
 * Sunucuların durumunu kontrol et
 */
async function checkServerStatus() {
  try {
    // 24 saat içinde kontrol edilmemiş sunucular
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    
    const uncheckedServers = await Server.find({
      lastChecked: { $lt: dayAgo },
      isActive: true
    });
    
    if (uncheckedServers.length > 0) {
      await sendSystemNotification({
        title: 'Sunucu Durumu Kontrolü',
        message: `${uncheckedServers.length} sunucu 24 saat içinde kontrol edilmedi.`,
        recipientRoles: ['ADMIN', 'SYSTEM_ADMIN'],
        relatedResource: {
          resourceType: 'Server',
          resourceName: 'Status Monitoring'
        }
      });
    }
  } catch (error) {
    logError('Sunucu durumu kontrolü hatası:', error, { function: 'checkServerStatus' });
  }
}

/**
 * Veritabanı sağlık kontrolü
 */
async function checkDatabaseHealth() {
  try {
    // Veritabanı durumunu kontrol et
    const status = await mongoose.connection.db.admin().serverStatus();
    
    if (status.connections.current > status.connections.available * 0.8) {
      // Bağlantı sayısı limit yaklaşıyorsa uyarı
      await sendSystemNotification({
        title: 'Veritabanı Bağlantı Uyarısı',
        message: `Veritabanı bağlantı sayısı limitlere yaklaşıyor: ${status.connections.current}/${status.connections.available}`,
        type: 'WARNING',
        recipientRoles: ['ADMIN'],
        relatedResource: {
          resourceType: 'System',
          resourceName: 'Database'
        }
      });
    }
  } catch (error) {
    logError('Veritabanı sağlık kontrolü hatası:', error, { function: 'checkDatabaseHealth' });
  }
}

/**
 * Kritik sunucuları izle
 */
async function monitorCriticalServers() {
  try {
    const criticalServers = await Server.find({
      isCritical: true,
      isActive: true
    });
    
    // Her kritik sunucuyu kontrol et
    for (const server of criticalServers) {
      // Sunucu durumu kontrolü - bu gerçek uygulamada ping, HTTP request vb. olacaktır
      // Bu örnekte sadece simülasyon yapıyoruz
      const isOnline = Math.random() > 0.05; // %5 ihtimalle çevrimdışı
      
      if (!isOnline && server.status !== 'offline') {
        // Sunucu çevrimdışı olmuşsa bildirim gönder
        await sendSystemNotification({
          title: 'KRİTİK SUNUCU ÇEVRIMDIŞI',
          message: `Kritik sunucu ${server.name} (${server.ipAddress}) çevrimdışı oldu!`,
          type: 'ERROR',
          recipientRoles: ['ADMIN', 'SYSTEM_ADMIN'],
          relatedResource: {
            resourceType: 'Server',
            resourceId: server._id,
            resourceName: server.name
          }
        });
        
        // Sunucu durumunu güncelle
        server.status = 'offline';
        server.lastChecked = new Date();
        await server.save();
      } else if (isOnline && server.status === 'offline') {
        // Sunucu tekrar çevrimiçi olmuşsa bildirim gönder
        await sendSystemNotification({
          title: 'Sunucu Tekrar Çevrimiçi',
          message: `Sunucu ${server.name} (${server.ipAddress}) tekrar çevrimiçi oldu.`,
          type: 'SUCCESS',
          recipientRoles: ['ADMIN', 'SYSTEM_ADMIN'],
          relatedResource: {
            resourceType: 'Server',
            resourceId: server._id,
            resourceName: server.name
          }
        });
        
        // Sunucu durumunu güncelle
        server.status = 'online';
        server.lastChecked = new Date();
        await server.save();
      }
    }
  } catch (error) {
    logError('Kritik sunucu izleme hatası:', error, { function: 'monitorCriticalServers' });
  }
}

/**
 * Günlük rapor oluştur
 */
async function generateDailyReport() {
  try {
    // Son 24 saatlik istatistikler
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Giriş istatistikleri
    const loginCount = await AuditLog.countDocuments({
      action: 'USER_LOGIN',
      timestamp: { $gte: oneDayAgo }
    });
    
    const loginFailCount = await AuditLog.countDocuments({
      action: 'USER_LOGIN_FAILED',
      timestamp: { $gte: oneDayAgo }
    });
    
    // Cihaz hareketleri
    const deviceMoves = await AuditLog.countDocuments({
      action: 'DEVICE_MOVED',
      timestamp: { $gte: oneDayAgo }
    });
    
    // Sunucu aktviteleri
    const serverEvents = await AuditLog.countDocuments({
      action: { $regex: /^SERVER_/ },
      timestamp: { $gte: oneDayAgo }
    });
    
    // Yeni kullanıcılar
    const newUsers = await User.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });
    
    // Günlük raporu oluştur
    await sendSystemNotification({
      title: 'Günlük Sistem Raporu',
      message: `
        Son 24 saat sistem raporu:
        - Başarılı giriş: ${loginCount}
        - Başarısız giriş denemesi: ${loginFailCount}
        - Cihaz taşıma: ${deviceMoves}
        - Sunucu olayları: ${serverEvents}
        - Yeni kullanıcılar: ${newUsers}
      `,
      type: 'INFO',
      recipientRoles: ['ADMIN', 'SYSTEM_ADMIN', 'MANAGER'],
      relatedResource: {
        resourceType: 'System',
        resourceName: 'Daily Report'
      },
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 gün sonra süresi dolsun
    });
    
  } catch (error) {
    logError('Günlük rapor oluşturma hatası:', error, { function: 'generateDailyReport' });
  }
}

module.exports = {
  cleanupExpiredNotifications,
  checkWarrantyExpirations,
  checkServerStatus,
  checkDatabaseHealth,
  monitorCriticalServers,
  generateDailyReport
};
