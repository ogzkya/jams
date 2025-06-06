/**
 * MongoDB veritabanını başlatan script
 * 
 * Kullanım:
 * node scripts/initDB.js
 * 
 * Bu script:
 * 1. MongoDB'ye bağlanır
 * 2. Gerekli koleksiyonları oluşturur
 * 3. Varsayılan rolleri ekler
 * 4. Admin kullanıcısı oluşturur (eğer yoksa)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

const DB_NAME = process.env.DB_NAME || 'jams';
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;

async function initializeDatabase() {
  try {
    console.log('🔄 Veritabanı başlatılıyor...');
    console.log(`🔗 MongoDB URI: ${MONGODB_URI}`);

    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB bağlantısı başarılı');

    // Roller koleksiyonunu tanımla
    const roleSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      description: { type: String },
      permissions: [{ type: String }],
      isSystem: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    });
    
    const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

    // Kullanıcılar koleksiyonunu tanımla
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      firstName: { type: String },
      lastName: { type: String },
      department: { type: String },
      position: { type: String },
      phone: { type: String },
      roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
      isActive: { type: Boolean, default: true },
      isLocked: { type: Boolean, default: false },
      lockUntil: { type: Date },
      loginAttempts: { type: Number, default: 0 },
      lastLogin: { type: Date },
      createdAt: { type: Date, default: Date.now }
    });

    // Parola hash'leme
    userSchema.pre('save', async function(next) {
      if (!this.isModified('password')) return next();
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Varsayılan rolleri oluştur
    console.log('🔄 Varsayılan roller kontrol ediliyor...');
    
    const roles = [
      {
        name: 'ADMIN',
        description: 'Sistem yöneticisi',
        permissions: ['*'],
        isSystem: true
      },
      {
        name: 'SYSTEM_ADMIN',
        description: 'Teknik sistem yöneticisi',
        permissions: ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'SERVER_*', 'SYSTEM_*'],
        isSystem: true
      },
      {
        name: 'INVENTORY_MANAGER',
        description: 'Envanter yöneticisi',
        permissions: ['INVENTORY_*', 'LOCATION_VIEW'],
        isSystem: true
      },
      {
        name: 'OBSERVER',
        description: 'Salt okunur erişim',
        permissions: ['*_VIEW'],
        isSystem: true
      }
    ];

    for (const role of roles) {
      const existingRole = await Role.findOne({ name: role.name });
      if (!existingRole) {
        await Role.create(role);
        console.log(`✅ Rol oluşturuldu: ${role.name}`);
      } else {
        console.log(`ℹ️ Rol zaten mevcut: ${role.name}`);
      }
    }

    // Admin kullanıcısını oluştur
    console.log('🔄 Admin kullanıcısı kontrol ediliyor...');
    
    const adminExists = await User.findOne({ 
      $or: [{ username: 'admin' }, { email: 'admin@system.com' }]
    });

    if (!adminExists) {
      const adminRole = await Role.findOne({ name: 'ADMIN' });
      
      if (!adminRole) {
        throw new Error('ADMIN rolü bulunamadı');
      }
      
      const admin = new User({
        username: 'admin',
        email: 'admin@system.com',
        password: uuidv4().substring(0, 8) + 'Aa1!', // Güçlü rastgele şifre
        firstName: 'Admin',
        lastName: 'User',
        roles: [adminRole._id],
        isActive: true
      });
      
      await admin.save();
      console.log('✅ Admin kullanıcısı oluşturuldu');
      console.log(`📝 Kullanıcı adı: ${admin.username}`);
      console.log(`🔑 Şifre: ${admin.password}`); // Bu hash'lenmiş şifre, burada sadece log amaçlı
      console.log('⚠️ İlk girişte şifreyi değiştirmeyi unutmayın!');
    } else {
      console.log('ℹ️ Admin kullanıcısı zaten mevcut');
    }

    console.log('✅ Veritabanı başarıyla başlatıldı');
    
  } catch (error) {
    logError('Veritabanı başlatma hatası:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script direkt çalıştırıldıysa
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
