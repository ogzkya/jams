const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lokasyon adı gereklidir'],
    trim: true,
    maxlength: [100, 'Lokasyon adı en fazla 100 karakter olmalıdır']
  },  
  type: {
    type: String,
    required: [true, 'Lokasyon tipi gereklidir'],
    enum: {
      values: ['MAIN_BUILDING', 'FLOOR', 'SECTION', 'ROOM', 'DEPARTMENT', 'UNIT', 'REMOTE_SITE'],
      message: 'Geçersiz lokasyon tipi'
    }
  },
  code: {
    type: String,
    unique: true,
    sparse: true, // null değerlere izin ver ama unique olanları kontrol et
    uppercase: true,
    trim: true,
    maxlength: [20, 'Lokasyon kodu en fazla 20 karakter olmalıdır']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama en fazla 500 karakter olmalıdır']
  },
  
  // Hiyerarşik yapı için parent referansı
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  
  // Ana bina için özel alanlar
  buildingInfo: {
    // Sadece ana bina için
    floors: {
      min: { type: Number, default: -3 }, // En alt kat (-3)
      max: { type: Number, default: 5 }   // En üst kat (5)
    },
    sections: [{
      name: { type: String, required: true }, // A, B, C
      description: String
    }]
  },
  
  // Kat için özel alanlar
  floorInfo: {
    level: { type: Number }, // Kat numarası (-3 ile 5 arası)
    section: { type: String }, // A, B, C bölümü
    floorPlan: {
      svgData: String, // SVG planı
      uploadedFile: String, // Yüklenen dosya yolu
      coordinates: [{
        roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }]
    }
  },
  
  // Oda için özel alanlar
  roomInfo: {
    roomNumber: String,    
    roomType: {
      type: String,
      enum: ['Ofis', 'SistemOdasi', 'ElektrikOdasi', 'ToplantOdasi', 'Depo', 'Banyo', 'Koridor', 'Diger']
    },
    capacity: Number, // Kişi kapasitesi
    area: Number,     // m² cinsinden alan
    features: [String] // Klima, projeksiyon vb.
  },
  
  // Uzak lokasyon için özel alanlar
  remoteInfo: {
    address: {
      street: String,
      city: String,
      district: String,
      postalCode: String,
      country: { type: String, default: 'Türkiye' }
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    vpnInfo: {
      isConnected: { type: Boolean, default: false },
      vpnType: { type: String, default: 'TTVPN' },
      connectionDetails: String
    },
    contactInfo: {
      phone: String,
      email: String,
      responsiblePerson: String
    }
  },
  
  // Departman/birim için özel alanlar
  organizationInfo: {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    employeeCount: { type: Number, default: 0 },
    budget: Number,
    costCenter: String
  },
  
  // Genel bilgiler
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String], // Arama için etiketler
  customFields: [{
    key: String,
    value: mongoose.Schema.Types.Mixed,
    type: { type: String, enum: ['text', 'number', 'boolean', 'date'] }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual alanlar
locationSchema.virtual('fullPath').get(function() {
  // Bu alan populate edildikten sonra hesaplanacak
  return this.name;
});

locationSchema.virtual('childrenCount').get(function() {
  return this.children ? this.children.length : 0;
});

// Alt lokasyonları sanal alan olarak tanımla
locationSchema.virtual('children', {
  ref: 'Location',
  localField: '_id',
  foreignField: 'parent'
});

// İndeksler
locationSchema.index({ code: 1 });
locationSchema.index({ type: 1 });
locationSchema.index({ parent: 1 });
locationSchema.index({ isActive: 1 });
locationSchema.index({ 'buildingInfo.floors.min': 1, 'buildingInfo.floors.max': 1 });
locationSchema.index({ 'floorInfo.level': 1 });
locationSchema.index({ 'roomInfo.roomType': 1 });
locationSchema.index({ tags: 1 });

// Pre-save middleware - kod üretimi
locationSchema.pre('save', function(next) {
  if (!this.code && this.parent) {
    // Otomatik kod üretimi için parent kodu kullan
    this.populate('parent', 'code')
      .then(() => {
        if (this.parent && this.parent.code) {
          // Örnek: Ana bina "MB", kat "MB-F1", oda "MB-F1-R101"
          const parentCode = this.parent.code;
          switch (this.type) {
            case 'FLOOR':
              this.code = `${parentCode}-F${this.floorInfo.level}${this.floorInfo.section || ''}`;
              break;
            case 'ROOM':
              this.code = `${parentCode}-R${this.roomInfo.roomNumber}`;
              break;
            case 'DEPARTMENT':
            case 'UNIT':
              this.code = `${parentCode}-${this.name.substring(0, 3).toUpperCase()}`;
              break;
            default:
              this.code = `${parentCode}-${Date.now().toString().slice(-4)}`;
          }
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

module.exports = mongoose.model('Location', locationSchema);
