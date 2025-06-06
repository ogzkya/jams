const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

// Veritabanı adı
const DB_NAME = process.env.DB_NAME || 'jams';

// Kullanıcıdan girdi almak için readline arayüzü
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Kullanıcı girişi istemek için promise tabanlı fonksiyon
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdminUser() {
  try {
    console.log('🔗 MongoDB\'ye bağlanılıyor...');
    
    // MongoDB'ye bağlan
    await mongoose.connect(process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`);
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // User modeli şeması
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      firstName: { type: String },
      lastName: { type: String },
      isActive: { type: Boolean, default: true },
      isLocked: { type: Boolean, default: false },
      isEmailVerified: { type: Boolean, default: false },
      roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
      createdAt: { type: Date, default: Date.now },
      lastLogin: { type: Date }
    });
    
    // Parola hash'leme
    userSchema.pre('save', async function(next) {
      if (!this.isModified('password')) return next();
      
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error);
      }
    });
    
    // Rol şeması
    const roleSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      description: { type: String },
      permissions: [{ type: String }],
      isSystem: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    });
    
    // Modelleri oluştur (eğer zaten varsa kullan)
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
    
    // Admin rolünü kontrol et veya oluştur
    let adminRole = await Role.findOne({ name: 'ADMIN' });
    
    if (!adminRole) {
      console.log('🔄 Admin rolü bulunamadı. Oluşturuluyor...');
      adminRole = new Role({
        name: 'ADMIN',
        description: 'System Administrator',
        permissions: ['*'], // Tüm izinler
        isSystem: true
      });
      
      await adminRole.save();
      console.log('✅ Admin rolü oluşturuldu');
    }
    
    // Mevcut admin kontrolü
    const existingAdmin = await User.findOne({
      $or: [
        { username: 'admin' },
        { email: 'admin@system.com' }
      ]
    });
    
    if (existingAdmin) {
      console.log('ℹ️ Admin kullanıcısı zaten var:');
      console.log(`📝 Kullanıcı adı: ${existingAdmin.username}`);
      console.log(`📧 E-posta: ${existingAdmin.email}`);
      
      const resetPassword = await question('Admin şifresini sıfırlamak ister misiniz? (e/h): ');
      
      if (resetPassword.toLowerCase() === 'e') {
        const newPassword = await question('Yeni şifre: ');
        
        if (newPassword.length < 6) {
          console.log('❌ Şifre en az 6 karakter olmalıdır. İşlem iptal edildi.');
        } else {
          existingAdmin.password = newPassword;
          await existingAdmin.save();
          console.log('✅ Admin şifresi başarıyla güncellendi');
        }
      }
    } else {
      console.log('🔄 Admin kullanıcısı oluşturuluyor...');
      
      // Kullanıcıdan bilgileri al
      const username = await question('Kullanıcı adı (varsayılan: admin): ') || 'admin';
      const email = await question('E-posta (varsayılan: admin@system.com): ') || 'admin@system.com';
      const firstName = await question('İsim (varsayılan: Admin): ') || 'Admin';
      const lastName = await question('Soyisim (varsayılan: User): ') || 'User';
      const password = await question('Şifre: ');
      
      if (!password || password.length < 6) {
        console.log('❌ Şifre en az 6 karakter olmalıdır. İşlem iptal edildi.');
      } else {
        const newAdmin = new User({
          username,
          email,
          password,
          firstName,
          lastName,
          isActive: true,
          isEmailVerified: true,
          roles: [adminRole._id]
        });
        
        await newAdmin.save();
        console.log('✅ Admin kullanıcısı başarıyla oluşturuldu');
        console.log(`📝 Kullanıcı adı: ${newAdmin.username}`);
        console.log(`📧 E-posta: ${newAdmin.email}`);
      }
    }
    
  } catch (error) {
    logError('Admin kullanıcısı oluşturma işlemi sırasında hata oluştu:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script doğrudan çalıştırıldıysa
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;
