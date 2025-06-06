const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

// Backend'deki .env dosyasını yükle
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function unlockAdmin() {
  try {
    console.log('🔗 MongoDB\'ye bağlanılıyor...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // User modelini tanımla
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      department: { type: String },
      position: { type: String },
      roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
      isActive: { type: Boolean, default: true },
      isLocked: { type: Boolean, default: false },
      lockUntil: { type: Date },
      loginAttempts: { type: Number, default: 0 },
      isEmailVerified: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Mevcut admin kullanıcılarını sil
    console.log('🗑️ Mevcut admin kullanıcıları siliniyor...');
    const deleteResult = await User.deleteMany({ username: 'admin' });
    console.log(`✅ ${deleteResult.deletedCount} admin kullanıcısı silindi`);
    
    console.log('👤 Yeni admin kullanıcısı oluşturuluyor...');
    
    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Yeni admin kullanıcısını oluştur
    const newAdmin = new User({
      username: 'admin',
      email: 'admin@jams.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isLocked: false,
      loginAttempts: 0,
      isEmailVerified: true
    });
    
    await newAdmin.save();
    
    console.log('✅ Yeni admin kullanıcısı başarıyla oluşturuldu');
    console.log('👤 Kullanıcı adı: admin');
    console.log('📧 E-posta: admin@jams.com');
    console.log('🔑 Şifre: admin123');
    
  } catch (error) {
    logError('Admin kilidi açma hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
unlockAdmin();
