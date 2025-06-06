const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Backend'deki .env dosyasını yükle
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function createAdmin() {
  try {
    console.log('🔗 MongoDB\'ye bağlanılıyor...');
    
    // MongoDB'ye bağlan
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // Basit user şeması tanımla (model import etmek yerine)
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String },
      isActive: { type: Boolean, default: true },
      isLocked: { type: Boolean, default: false },
      roles: [{ type: String }],
      createdAt: { type: Date, default: Date.now }
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Admin kullanıcısı var mı kontrol et
    const existingAdmin = await User.findOne({ 
      $or: [{ username: 'admin' }, { email: 'admin@jams.com' }]
    });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin kullanıcısı zaten mevcut:', existingAdmin.username);
      return;
    }
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Admin kullanıcısı oluştur
    const adminUser = new User({
      username: 'admin',
      email: 'admin@jams.com',
      password: hashedPassword,
      name: 'Sistem Yöneticisi',
      roles: ['ADMIN'],
      isActive: true,
      isLocked: false
    });
    
    await adminUser.save();
    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu');
    console.log('👤 Kullanıcı adı: admin');
    console.log('📧 E-posta: admin@jams.com');
    console.log('🔑 Şifre: admin123');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
createAdmin();
