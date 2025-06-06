const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../backend/.env' });
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

async function updateAdmin() {
  try {
    console.log('MongoDB\'ye bağlanılıyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
    console.log('✅ MongoDB bağlantısı başarılı');

    // User şemasını tanımla
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      name: String,
      firstName: String,
      lastName: String,
      isActive: { type: Boolean, default: true },
      isLocked: { type: Boolean, default: false },
      roles: [String],
      role: String,
      department: String,
      position: String,
      loginAttempts: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    });

    const User = mongoose.model('User', userSchema);

    // Mevcut admin kullanıcısını bul ve güncelle
    const existingAdmin = await User.findOne({ 
      $or: [{ email: 'admin@jams.com' }, { username: 'admin' }]
    });

    if (existingAdmin) {
      console.log('Admin kullanıcısı bulundu, güncelleniyor...');
      
      // Şifreyi yeniden hash'le
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await User.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            username: 'admin',
            email: 'admin@jams.com',
            password: hashedPassword,
            name: 'Sistem Yöneticisi',
            firstName: 'Sistem',
            lastName: 'Yöneticisi',
            isActive: true,
            isLocked: false,
            role: 'Admin',
            department: 'IT',
            position: 'Sistem Yöneticisi',
            loginAttempts: 0
          }
        }
      );
      
      console.log('✅ Admin kullanıcısı güncellendi');
    } else {
      console.log('Admin kullanıcısı bulunamadı, yeni oluşturuluyor...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await User.create({
        username: 'admin',
        email: 'admin@jams.com',
        password: hashedPassword,
        name: 'Sistem Yöneticisi',
        firstName: 'Sistem',
        lastName: 'Yöneticisi',
        isActive: true,
        isLocked: false,
        role: 'Admin',
        department: 'IT',
        position: 'Sistem Yöneticisi',
        loginAttempts: 0
      });
      
      console.log('✅ Yeni admin kullanıcısı oluşturuldu');
    }

    // Test kullanıcısı da oluşturalım
    const existingUser = await User.findOne({ username: 'test' });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('test123', 12);
      
      await User.create({
        username: 'test',
        email: 'test@jams.com',
        password: hashedPassword,
        name: 'Test Kullanıcısı',
        firstName: 'Test',
        lastName: 'Kullanıcısı',
        isActive: true,
        isLocked: false,
        role: 'Izleyici',
        department: 'Test',
        position: 'Test Kullanıcısı',
        loginAttempts: 0
      });
      
      console.log('✅ Test kullanıcısı oluşturuldu');
    }

    console.log('\n🎉 Kullanıcılar hazır:');
    console.log('👤 Admin - Kullanıcı adı: admin, Şifre: admin123');
    console.log('👤 Test - Kullanıcı adı: test, Şifre: test123');

  } catch (error) {
    logError('Admin güncelleme hatası (final script):', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

updateAdmin();
