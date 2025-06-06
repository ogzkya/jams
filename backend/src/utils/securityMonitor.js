/**
 * Güvenlik İzleme ve Uyarı Sistemi
 */
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { logError } = require('../../../utils/errorLogger');
const nodemailer = require('nodemailer');

// Güvenlik olayları
const SECURITY_EVENTS = {
  BRUTE_FORCE: 'BRUTE_FORCE_ATTEMPT',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  ROLE_CHANGE: 'CRITICAL_ROLE_CHANGE',
  MULTIPLE_FAILURES: 'MULTIPLE_LOGIN_FAILURES',
  ADMIN_ACTION: 'SENSITIVE_ADMIN_ACTION'
};

/**
 * Güvenlik olayı oluştur ve izle
 * @param {String} eventType - Olay türü
 * @param {Object} eventData - Olay verileri
 * @param {Object} req - Express request nesnesi
 * @returns {Promise<Object>} Oluşturulan olay
 */
async function createSecurityEvent(eventType, eventData, req = null) {
  try {
    // IP adresi ve user agent bilgileri
    const ipAddress = req?.ip || eventData?.ip || 'unknown';
    const userAgent = req?.headers?.['user-agent'] || eventData?.userAgent || 'unknown';
    
    // Kullanıcı bilgileri
    const userId = eventData?.userId || req?.user?._id;
    const username = eventData?.username || req?.user?.username || 'anonymous';
    
    // Güvenlik olayını kaydet
    const securityEvent = await AuditLog.create({
      action: eventType,
      user: userId,
      username,
      userIP: ipAddress,
      userAgent,
      resource: eventData?.resource || { type: 'SECURITY', name: 'security_event' },
      details: {
        description: eventData?.description || `Güvenlik olayı: ${eventType}`,
        metadata: eventData?.metadata || {}
      },
      category: 'SECURITY',
      severity: eventData?.severity || 'HIGH',
      result: 'FAILURE',
      timestamp: new Date()
    });
    
    // Eşik değeri aştıysa alarm oluştur
    const shouldAlert = await checkSecurityThresholds(eventType, userId, ipAddress);
    
    if (shouldAlert) {
      await createSecurityAlert(eventType, {
        userId,
        username,
        ipAddress,
        userAgent,
        eventId: securityEvent._id,
        details: eventData
      });
    }
    
    return securityEvent;
  } catch (error) {
    logError('ERROR', 'Güvenlik olayı oluşturma hatası', error, { eventType, eventData });
    return null;
  }
}

/**
 * Güvenlik eşik değerlerini kontrol et
 * @param {String} eventType - Olay türü
 * @param {String} userId - Kullanıcı ID
 * @param {String} ipAddress - IP adresi
 * @returns {Promise<Boolean>} Eşik değeri aşıldı mı
 */
async function checkSecurityThresholds(eventType, userId, ipAddress) {
  try {
    const now = new Date();
    const timeWindowMinutes = 60; // 1 saat
    const timeThreshold = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    // Olay türüne göre eşik değerleri
    const thresholds = {
      [SECURITY_EVENTS.BRUTE_FORCE]: 5,
      [SECURITY_EVENTS.UNAUTHORIZED_ACCESS]: 3,
      [SECURITY_EVENTS.MULTIPLE_FAILURES]: 5,
      [SECURITY_EVENTS.SUSPICIOUS_ACTIVITY]: 3,
      [SECURITY_EVENTS.ROLE_CHANGE]: 1,
      [SECURITY_EVENTS.ADMIN_ACTION]: 1
    };
    
    // Belirli zaman aralığında aynı tip olayların sayısını kontrol et
    const filter = {
      action: eventType,
      timestamp: { $gte: timeThreshold }
    };
    
    // Kullanıcı veya IP için filtreleme
    if (userId) {
      filter.user = userId;
    } else if (ipAddress) {
      filter.userIP = ipAddress;
    }
    
    const count = await AuditLog.countDocuments(filter);
    const threshold = thresholds[eventType] || 5;
    
    return count >= threshold;
  } catch (error) {
    logError('ERROR', 'Güvenlik eşik değeri kontrolü hatası', error, { eventType, userId, ipAddress });
    return false;
  }
}

/**
 * Güvenlik uyarısı oluştur ve bildir
 * @param {String} alertType - Uyarı türü
 * @param {Object} alertData - Uyarı verileri
 * @returns {Promise<Boolean>} Başarılı mı
 */
async function createSecurityAlert(alertType, alertData) {
  try {
    // Uyarı mesajını oluştur
    const alertMessage = createAlertMessage(alertType, alertData);
    
    // Yöneticilere ve güvenlik ekibine bildir
    const adminUsers = await User.find({
      'roles.name': 'ADMIN'
    }).select('email');
    
    // E-posta bildirimi gönder
    if (process.env.ENABLE_EMAIL_ALERTS === 'true' && adminUsers.length > 0) {
      const adminEmails = adminUsers.map(user => user.email);
      await sendSecurityAlertEmail(alertType, alertMessage, adminEmails);
    }
    
    // Veritabanına uyarı kaydı ekle
    // Burada notification veya alerts koleksiyonuna kayıt eklenebilir
    
    return true;
  } catch (error) {
    logError('ERROR', 'Güvenlik uyarısı oluşturma hatası', error, { alertType, alertData });
    return false;
  }
}

/**
 * Uyarı mesajı oluştur
 * @param {String} alertType - Uyarı türü
 * @param {Object} alertData - Uyarı verileri
 * @returns {String} Uyarı mesajı
 */
function createAlertMessage(alertType, alertData) {
  const { username, ipAddress, details } = alertData;
  const timestamp = new Date().toISOString();
  
  const alertMessages = {
    [SECURITY_EVENTS.BRUTE_FORCE]: `BRUTE FORCE UYARISI: ${username} kullanıcısı için ${ipAddress} adresinden brute force saldırısı tespit edildi.`,
    [SECURITY_EVENTS.UNAUTHORIZED_ACCESS]: `YETKİSİZ ERİŞİM UYARISI: ${username} kullanıcısı ${ipAddress} adresinden yetkisiz erişim denemesi yaptı.`,
    [SECURITY_EVENTS.MULTIPLE_FAILURES]: `ÇOKLU BAŞARISIZ GİRİŞ UYARISI: ${username} kullanıcısı için ${ipAddress} adresinden çoklu başarısız giriş denemesi.`,
    [SECURITY_EVENTS.SUSPICIOUS_ACTIVITY]: `ŞÜPHELİ AKTİVİTE UYARISI: ${username} kullanıcısı için ${ipAddress} adresinden şüpheli aktivite tespit edildi.`,
    [SECURITY_EVENTS.ROLE_CHANGE]: `KRİTİK ROL DEĞİŞİKLİĞİ UYARISI: ${details?.description || 'Kritik bir rol değişikliği yapıldı'}`,
    [SECURITY_EVENTS.ADMIN_ACTION]: `HASSAS YÖNETİCİ İŞLEMİ UYARISI: ${username} kullanıcısı ${details?.description || 'hassas bir yönetici işlemi'} gerçekleştirdi.`
  };
  
  const baseMessage = alertMessages[alertType] || `GÜVENLİK UYARISI: ${alertType} olayı tespit edildi.`;
  return `[${timestamp}] ${baseMessage}\nIP: ${ipAddress}\nDetaylar: ${JSON.stringify(details || {})}`;
}

/**
 * Güvenlik uyarısı e-postası gönder
 * @param {String} alertType - Uyarı türü
 * @param {String} message - Uyarı mesajı
 * @param {Array} recipients - Alıcılar
 * @returns {Promise<Boolean>} Gönderim başarılı mı
 */
async function sendSecurityAlertEmail(alertType, message, recipients) {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logError('WARNING', 'E-posta ayarları yapılandırılmamış', null, { alertType });
      return false;
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    const mailOptions = {
      from: `"Güvenlik Uyarı Sistemi" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `🚨 Güvenlik Uyarısı: ${alertType}`,
      text: message,
      html: `<div style="background-color:#f8f8f8; padding:20px; border-radius:5px; border-left:4px solid #ff3860;">
               <h2 style="color:#ff3860;">Güvenlik Uyarısı: ${alertType}</h2>
               <p style="white-space:pre-line;">${message.replace(/\n/g, '<br>')}</p>
               <p style="color:#888; font-size:12px; margin-top:20px;">
                 Bu otomatik bir uyarıdır. Lütfen güvenlik loglarını kontrol ediniz.
               </p>
             </div>`
    };
    
    await transporter.sendMail(mailOptions);
    return true;
    
  } catch (error) {
    logError('ERROR', 'Güvenlik uyarısı e-posta gönderme hatası', error, { alertType, recipients });
    return false;
  }
}

module.exports = {
  SECURITY_EVENTS,
  createSecurityEvent,
  checkSecurityThresholds,
  createSecurityAlert
};
