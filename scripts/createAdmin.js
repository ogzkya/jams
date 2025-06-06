const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const path = require('path');

// Backend'deki .env dosyasını yükle
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Modelleri import et
const User = require('../backend/src/models/User');

async function createAdminUser() {
  try {
    console.log('MongoDB\'ye bağlanılıyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
    
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // Admin kullanıcısının var olup olmadığını kontrol et
    const existingAdmin = await User.findOne({ email: 'admin@jams.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin kullanıcısı zaten mevcut');
      return;
    }
    
    console.log('👤 Admin kullanıcısı oluşturuluyor...');
    
    // Şifreyi hashle
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash('admin123', salt);
    
    // Admin kullanıcısını oluştur
    const adminUser = new User({
      username: 'admin',
      email: 'admin@jams.com',
      password: hashedPassword,
      name: 'System Administrator',
      isActive: true,
      isEmailVerified: true,
      roles: [] // Şimdilik boş, daha sonra rol ekleyeceğiz
    });
    
    await adminUser.save();
    
    console.log('✅ Admin kullanıcısı oluşturuldu:');
    console.log('   Email: admin@jams.com');
    console.log('   Şifre: admin123');
    console.log('🎉 Admin kullanıcısı başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
createAdminUser();
