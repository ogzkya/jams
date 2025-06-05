const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  // Temel bilgiler
  name: {
    type: String,
    required: [true, 'Sunucu adı gerekli'],
    trim: true,
    maxlength: [100, 'Sunucu adı en fazla 100 karakter olabilir']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama en fazla 500 karakter olabilir']
  },
  
  // Bağlantı bilgileri
  hostname: {
    type: String,
    required: [true, 'Hostname gerekli'],
    trim: true
  },
  ipAddress: {
    type: String,
    required: [true, 'IP adresi gerekli'],
    validate: {
      validator: function(v) {
        // IP adresi validasyonu (IPv4 ve IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(v) || ipv6Regex.test(v);
      },
      message: 'Geçerli bir IP adresi girin'
    }
  },
  port: {
    type: Number,
    default: 22,
    min: [1, 'Port 1-65535 arasında olmalı'],
    max: [65535, 'Port 1-65535 arasında olmalı']
  },
  
  // Kimlik doğrulama
  authentication: {
    type: {
      type: String,
      enum: ['password', 'key', 'both'],
      default: 'password'
    },
    username: {
      type: String,
      required: [true, 'Kullanıcı adı gerekli'],
      trim: true
    },
    // Şifre ve anahtar encrypted olarak saklanacak
    encryptedPassword: String,
    encryptedPrivateKey: String,
    publicKey: String
  },
  
  // Sunucu türü ve özellikleri
  serverType: {
    type: String,
    enum: ['linux', 'windows', 'unix', 'other'],
    default: 'linux'
  },
  architecture: {
    type: String,
    enum: ['x86', 'x64', 'arm', 'arm64', 'other'],
    default: 'x64'
  },
  
  // Konum bilgisi
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  
  // Durum bilgileri
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'error', 'unknown'],
    default: 'unknown'
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  uptime: Number, // Saniye cinsinden
  
  // Performans metrikleri
  performance: {
    cpuUsage: {
      type: Number,
      min: 0,
      max: 100
    },
    memoryUsage: {
      type: Number,
      min: 0,
      max: 100
    },
    diskUsage: {
      type: Number,
      min: 0,
      max: 100
    },
    networkLatency: Number, // ms cinsinden
    lastUpdated: Date
  },
  
  // Sistem bilgileri
  systemInfo: {
    os: {
      name: String,
      version: String,
      kernel: String
    },
    hardware: {
      cpu: {
        model: String,
        cores: Number,
        threads: Number
      },
      memory: {
        total: Number, // GB cinsinden
        available: Number
      },
      disk: {
        total: Number, // GB cinsinden
        available: Number
      }
    },
    services: [{
      name: String,
      status: {
        type: String,
        enum: ['running', 'stopped', 'error', 'unknown']
      },
      port: Number,
      lastChecked: Date
    }]
  },
  
  // İzin verilen komutlar
  allowedCommands: [{
    command: {
      type: String,
      required: true
    },
    description: String,
    parameters: [String],
    requiresConfirmation: {
      type: Boolean,
      default: false
    }
  }],
  
  // Güvenlik ayarları
  security: {
    allowRemoteExecution: {
      type: Boolean,
      default: false
    },
    restrictedCommands: [String],
    maxSessionDuration: {
      type: Number,
      default: 3600 // 1 saat
    },
    allowedIPs: [String],
    sshKeyFingerprint: String,
    lastSecurityScan: Date,
    vulnerabilities: [{
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String,
      cve: String,
      discoveredAt: {
        type: Date,
        default: Date.now
      },
      resolved: {
        type: Boolean,
        default: false
      }
    }]
  },
  
  // Monitoring ayarları
  monitoring: {
    enabled: {
      type: Boolean,
      default: true
    },
    checkInterval: {
      type: Number,
      default: 300 // 5 dakika
    },
    alertThresholds: {
      cpu: {
        type: Number,
        default: 80
      },
      memory: {
        type: Number,
        default: 80
      },
      disk: {
        type: Number,
        default: 90
      }
    },
    notifications: {
      email: [String],
      webhook: String
    }
  },
  
  // Tags ve kategoriler
  tags: [String],
  category: {
    type: String,
    enum: ['production', 'staging', 'development', 'testing', 'backup'],
    default: 'development'
  },
  
  // İstatistikler
  statistics: {
    totalConnections: {
      type: Number,
      default: 0
    },
    totalCommands: {
      type: Number,
      default: 0
    },
    lastConnection: Date,
    avgResponseTime: Number,
    totalUptime: Number, // Saniye cinsinden
    totalDowntime: Number
  },
  
  // Meta veriler
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
serverSchema.index({ name: 1 });
serverSchema.index({ ipAddress: 1 });
serverSchema.index({ hostname: 1 });
serverSchema.index({ status: 1 });
serverSchema.index({ category: 1 });
serverSchema.index({ location: 1 });
serverSchema.index({ isActive: 1 });
serverSchema.index({ createdBy: 1 });
serverSchema.index({ tags: 1 });

// Compound indexes
serverSchema.index({ status: 1, category: 1 });
serverSchema.index({ ipAddress: 1, port: 1 });

// Virtual fields
serverSchema.virtual('fullAddress').get(function() {
  return `${this.ipAddress}:${this.port}`;
});

serverSchema.virtual('uptimeFormatted').get(function() {
  if (!this.uptime) return 'Bilinmiyor';
  
  const days = Math.floor(this.uptime / 86400);
  const hours = Math.floor((this.uptime % 86400) / 3600);
  const minutes = Math.floor((this.uptime % 3600) / 60);
  
  if (days > 0) {
    return `${days} gün, ${hours} saat, ${minutes} dakika`;
  } else if (hours > 0) {
    return `${hours} saat, ${minutes} dakika`;
  } else {
    return `${minutes} dakika`;
  }
});

serverSchema.virtual('healthScore').get(function() {
  if (this.status === 'offline') return 0;
  if (this.status === 'error') return 25;
  if (this.status === 'maintenance') return 50;
  
  let score = 100;
  
  // Performans metriklerine göre skor hesapla
  if (this.performance) {
    if (this.performance.cpuUsage > 80) score -= 20;
    if (this.performance.memoryUsage > 80) score -= 20;
    if (this.performance.diskUsage > 90) score -= 30;
    if (this.performance.networkLatency > 1000) score -= 10;
  }
  
  return Math.max(0, score);
});

// Pre-save middleware
serverSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedBy = this.constructor.currentUser;
  }
  next();
});

// Methods
serverSchema.methods.updateStatus = async function(status, performanceData = null) {
  this.status = status;
  this.lastChecked = new Date();
  
  if (performanceData) {
    this.performance = {
      ...performanceData,
      lastUpdated: new Date()
    };
  }
  
  return this.save();
};

serverSchema.methods.addCommand = function(command, description, parameters = [], requiresConfirmation = false) {
  this.allowedCommands.push({
    command,
    description,
    parameters,
    requiresConfirmation
  });
  return this.save();
};

serverSchema.methods.removeCommand = function(command) {
  this.allowedCommands = this.allowedCommands.filter(cmd => cmd.command !== command);
  return this.save();
};

serverSchema.methods.isCommandAllowed = function(command) {
  return this.allowedCommands.some(cmd => cmd.command === command);
};

serverSchema.methods.incrementConnectionCount = function() {
  this.statistics.totalConnections += 1;
  this.statistics.lastConnection = new Date();
  return this.save();
};

serverSchema.methods.incrementCommandCount = function() {
  this.statistics.totalCommands += 1;
  return this.save();
};

// Static methods
serverSchema.statics.findByIP = function(ipAddress) {
  return this.findOne({ ipAddress, isActive: true });
};

serverSchema.statics.findOnlineServers = function() {
  return this.find({ status: 'online', isActive: true });
};

serverSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

serverSchema.statics.findByLocation = function(locationId) {
  return this.find({ location: locationId, isActive: true });
};

serverSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        online: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } },
        offline: { $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] } },
        maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
        error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        totalConnections: { $sum: '$statistics.totalConnections' },
        totalCommands: { $sum: '$statistics.totalCommands' },
        avgUptime: { $avg: '$uptime' }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    online: 0,
    offline: 0,
    maintenance: 0,
    error: 0,
    totalConnections: 0,
    totalCommands: 0,
    avgUptime: 0
  };
};

module.exports = mongoose.model('Server', serverSchema);
