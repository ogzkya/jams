const mongoose = require('mongoose');
const path = require('path');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

// Backend'deki .env dosyasını yükle
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function updateAdminUser() {
  try {
    console.log('🔗 MongoDB\'ye bağlanılıyor...');
    
    // MongoDB'ye bağlan
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // Admin kullanıcısını bul ve güncelle
    const result = await mongoose.connection.db.collection('users').updateMany(
      { email: 'admin@jams.com' },
      { 
        $set: { 
          username: 'admin',
          firstName: 'Sistem',
          lastName: 'Yöneticisi',
          isActive: true,
          isLocked: false,
          loginAttempts: 0
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Admin kullanıcısı başarıyla güncellendi');
    } else {
      console.log('ℹ️  Admin kullanıcısı zaten güncel veya bulunamadı');
    }
    
    // Güncellenmiş kullanıcıyı göster
    const updatedUser = await mongoose.connection.db.collection('users').findOne({ username: 'admin' });
    if (updatedUser) {
      console.log('📋 Güncellenmiş admin kullanıcısı:');
      console.log('   👤 Kullanıcı adı:', updatedUser.username);
      console.log('   📧 E-posta:', updatedUser.email);
      console.log('   👥 Roller:', updatedUser.roles || updatedUser.role);
      console.log('   ✅ Aktif:', updatedUser.isActive);
    }
    
  } catch (error) {
    logError('Admin kullanıcısı güncelleme hatası', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
updateAdminUser();
