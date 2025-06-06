const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  // Kullanıcı bilgileri
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  username: {
    type: String
  },
  
  // Olay bilgileri
  action: {
    type: String,
    required: [true, 'Eylem tipi gereklidir'],
    enum: {
      values: [
        // Kullanıcı eylemleri
        'USER_LOGIN', 'USER_LOGOUT', 'USER_LOGIN_FAILED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_LOCKED', 'USER_UNLOCKED', 'USER_REGISTRATION_FAILED',
        
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
  resource: {
    type: mongoose.Schema.Types.Mixed
  },
  
  resourceType: {
    type: String,
    enum: ['USER', 'DEVICE', 'LOCATION', 'PASSWORD', 'SERVER', 'ROLE', 'SYSTEM', 'OTHER']
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  
  // IP adresi
  ip: {
    type: String
  },
  
  userIP: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  category: {
    type: String,
    enum: ['AUTHENTICATION', 'AUTHORIZATION', 'DATA', 'SYSTEM', 'SECURITY', 'OTHER']
  },
  
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  
  result: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'ERROR']
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
auditSchema.statics.createLog = function(data) {
  const logData = {
    action: data.action,
    user: data.user,
    username: data.username,
    resource: data.resource,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    ip: data.ip || data.userIP,
    userIP: data.userIP,
    userAgent: data.userAgent,
    category: data.category,
    severity: data.severity,
    result: data.result,
    details: data.details,
    timestamp: new Date()
  };
  
  return this.create(logData);
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
