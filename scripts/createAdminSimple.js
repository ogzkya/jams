const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

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
    
    // Parola hash'leme ekleyin
    userSchema.pre('save', async function(next) {
      if (!this.isModified('password')) return next();
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    });
    
    const User = mongoose.model('User', userSchema);
    
    // Admin kullanıcısı var mı kontrol et
    const existingAdmin = await User.findOne({ 
      $or: [{ username: 'admin' }, { email: 'admin@jams.com' }]
    });
    
    if (existingAdmin) {
      console.log('ℹ️ Admin kullanıcısı zaten var. Yaratılmadı.');
      return;
    }
    
    // Admin kullanıcısı oluştur
    const adminUser = new User({
      username: 'admin',
      email: 'admin@jams.com',
      password: 'Admin123!', // Sadece basit test için, gerçek ortamda daha güçlü şifre kullanın
      name: 'Admin User',
      roles: ['ADMIN']
    });
    
    await adminUser.save();
    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu');
    console.log('📝 Kullanıcı adı: admin');
    console.log('🔑 Şifre: Admin123!');
    console.log('⚠️ İlk girişte şifreyi değiştirmeyi unutmayın!');
    
  } catch (error) {
    logError('Admin oluşturma hatası (simple script):', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script doğrudan çalıştırıldıysa
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;
