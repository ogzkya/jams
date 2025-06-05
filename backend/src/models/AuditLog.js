const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  // Kullanıcı bilgileri
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Olay bilgileri
  action: {
    type: String,
    required: [true, 'Eylem tipi gereklidir'],
    enum: {
      values: [
        // Kullanıcı eylemleri
        'USER_LOGIN', 'USER_LOGOUT', 'USER_LOGIN_FAILED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_LOCKED', 'USER_UNLOCKED',
        
        // Envanter eylemleri
        'DEVICE_CREATED', 'DEVICE_UPDATED', 'DEVICE_DELETED', 'DEVICE_MOVED', 'DEVICE_ASSIGNED', 'DEVICE_UNASSIGNED', 'QR_GENERATED', 'QR_SCANNED',
        
        // Lokasyon eylemleri
        'LOCATION_CREATED', 'LOCATION_UPDATED', 'LOCATION_DELETED', 'FLOORPLAN_UPLOADED', 'FLOORPLAN_UPDATED',
        
        // Şifre yönetimi eylemleri
        'PASSWORD_CREATED', 'PASSWORD_VIEWED', 'PASSWORD_UPDATED', 'PASSWORD_DELETED', 'PASSWORD_DECRYPTED',
        
        // Sunucu yönetimi eylemleri
        'SERVER_ACCESSED', 'SCRIPT_EXECUTED', 'SERVER_INFO_VIEWED', 'SERVER_LOGS_VIEWED',
        
        // Sistem eylemleri
        'BACKUP_CREATED', 'BACKUP_RESTORED', 'SETTINGS_UPDATED', 'MAINTENANCE_MODE', 'EXPORT_PERFORMED',
        
        // Rol ve yetki eylemleri
        'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED'
      ],
      message: 'Geçersiz eylem tipi'
    }
  },
  
  // Kaynak bilgileri
  resourceType: {
    type: String,
    required: [true, 'Kaynak tipi gereklidir'],
    enum: ['USER', 'DEVICE', 'LOCATION', 'PASSWORD', 'SERVER', 'ROLE', 'SYSTEM', 'OTHER']
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  
  // IP adresi
  ip: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // IPv4 veya IPv6 formatını kontrol et
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v) ||
               /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
      },
      message: 'Geçerli bir IP adresi giriniz'
    }
  },
  
  // Zaman damgası (otomatik createdAt yerine manuel kontrol için)
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Detaylar
  details: mongoose.Mixed
}, {
  timestamps: true, // createdAt ve updatedAt alanları için
  capped: { size: 1024 * 1024 * 100, max: 100000 } // 100MB veya 100K kayıt limiti
});

// İndeksler - performans optimizasyonu için
auditSchema.index({ action: 1 });
auditSchema.index({ user: 1 });
auditSchema.index({ ip: 1 });
auditSchema.index({ resourceType: 1 });
auditSchema.index({ resourceId: 1 });
auditSchema.index({ timestamp: -1 }); // En yeni kayıtlar önce

// Compound indeksler
auditSchema.index({ action: 1, timestamp: -1 });
auditSchema.index({ user: 1, timestamp: -1 });

// Text search için
auditSchema.index({
  'details.description': 'text',
  'details.metadata.errorMessage': 'text',
  'resource.name': 'text'
});

// Static metodlar
auditSchema.statics.createLog = function({
  action,
  user,
  resourceType,
  resourceId,
  ip,
  details
}) {
  return this.create({
    action,
    user,
    resourceType,
    resourceId,
    ip,
    details,
    timestamp: new Date()
  });
};

// Başarılı eylem logu
auditSchema.statics.logSuccess = function(data) {
  return this.createLog({ ...data, result: 'SUCCESS' });
};

// Başarısız eylem logu
auditSchema.statics.logFailure = function(data) {
  return this.createLog({ ...data, result: 'FAILURE' });
};

// Hata logu
auditSchema.statics.logError = function(data) {
  return this.createLog({ ...data, result: 'ERROR' });
};

// Belirli bir kullanıcının loglarını getir
auditSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email firstName lastName');
};

// Belirli bir kaynağın loglarını getir
auditSchema.statics.findByResource = function(resourceType, resourceId, limit = 50) {
  return this.find({ 
    resourceType: resourceType,
    resourceId: resourceId 
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email firstName lastName');
};

// Güvenlik olaylarını getir
auditSchema.statics.findSecurityEvents = function(limit = 100) {
  return this.find({
    $or: [
      { category: 'SECURITY' },
      { severity: { $in: ['HIGH', 'CRITICAL'] } },
      { result: 'FAILURE' },
      { action: { $in: ['USER_LOGIN_FAILED', 'USER_LOCKED'] } }
    ]
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email firstName lastName');
};

module.exports = mongoose.model('AuditLog', auditSchema);
