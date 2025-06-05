const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Rol adı gereklidir'],
    unique: true,
    trim: true,
    uppercase: true,
    enum: {
      values: ['ADMIN', 'SYSTEM_ADMIN', 'TECH_SUPPORT', 'DEPARTMENT_MANAGER', 'OBSERVER'],
      message: 'Geçersiz rol tipi'
    }
  },
  displayName: {
    type: String,
    required: [true, 'Görünen ad gereklidir'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama en fazla 500 karakter olmalıdır']
  },
  permissions: {
    // Kullanıcı yönetimi izinleri
    users: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    
    // Envanter yönetimi izinleri
    inventory: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      qr_generate: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Lokasyon yönetimi izinleri
    locations: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      floor_plans: { type: Boolean, default: false }
    },
    
    // Şifre yönetimi izinleri
    passwords: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      decrypt: { type: Boolean, default: false }
    },
    
    // Sunucu yönetimi izinleri
    servers: {
      read: { type: Boolean, default: false },
      execute_scripts: { type: Boolean, default: false },
      system_info: { type: Boolean, default: false },
      logs: { type: Boolean, default: false }
    },
    
    // Denetim kayıtları izinleri
    audit: {
      read: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Sistem yönetimi izinleri
    system: {
      backup: { type: Boolean, default: false },
      settings: { type: Boolean, default: false },
      maintenance: { type: Boolean, default: false }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false // Sistem tarafından oluşturulan varsayılan roller için
  }
}, {
  timestamps: true
});

// İndeksler
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

module.exports = mongoose.model('Role', roleSchema);
