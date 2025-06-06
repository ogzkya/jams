const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lokasyon adı gereklidir'],
    trim: true,
    maxlength: [100, 'Lokasyon adı en fazla 100 karakter olmalıdır']
  },  type: {
    type: String,
    required: [true, 'Lokasyon tipi gereklidir'],
    enum: {
      values: ['AnaBina', 'Kat', 'Bolum', 'Oda', 'UzakLokasyon'],
      message: 'Geçersiz lokasyon tipi'
    }
  },code: {
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
    roomNumber: String,    roomType: {
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
locationSchema.pre('save', async function(next) {
  if (!this.code) {
    if (this.type === 'AnaBina') {
      // Ana bina için basit kod
      this.code = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') + 'B';
    } else if (this.parent) {
      try {
        // Parent'ı populate et
        await this.populate('parent');
        if (this.parent && this.parent.code) {
          const parentCode = this.parent.code;
          switch (this.type) {
            case 'Kat':
              this.code = `${parentCode}-K${this.floorInfo?.level || '1'}${this.floorInfo?.section || ''}`;
              break;
            case 'Oda':
              this.code = `${parentCode}-O${this.roomInfo?.roomNumber || Math.floor(Math.random() * 1000)}`;
              break;
            case 'Bolum':
              this.code = `${parentCode}-${this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')}`;
              break;
            default:
              this.code = `${parentCode}-${Date.now().toString().slice(-4)}`;
          }
        }
      } catch (error) {
        console.log('Parent populate hatası:', error);
        // Fallback kod üretimi
        this.code = `LOC-${Date.now().toString().slice(-6)}`;
      }
    } else {
      // Parent yok ise basit kod
      this.code = `LOC-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

module.exports = mongoose.model('Location', locationSchema);
