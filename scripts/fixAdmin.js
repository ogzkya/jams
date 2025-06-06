const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

async function fixAdmin() {
  try {
    await mongoose.connect('mongodb://localhost:27017/jams');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Admin kullanıcısını güncelle
    const result = await users.updateOne(
      { username: 'admin' },
      {
        $set: {
          password: hashedPassword,
          isLocked: false,
          loginAttempts: 0,
          firstName: 'Admin',
          lastName: 'User'
        },
        $unset: {
          lockUntil: ""
        }
      }
    );
    
    console.log('Admin updated:', result.modifiedCount);
    
    // Kontrol et
    const admin = await users.findOne({ username: 'admin' });
    console.log('Admin status:', {
      username: admin.username,
      isLocked: admin.isLocked,
      loginAttempts: admin.loginAttempts,
      firstName: admin.firstName,
      lastName: admin.lastName
    });
    
  } catch (error) {
    logError('Admin düzeltme hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

fixAdmin();
