const mongoose = require('mongoose');
const { logError } = require('../../../utils/errorLogger'); // errorLogger'ı içe aktar (yol düzeltildi)

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB bağlantısı başarılı: ${conn.connection.host}`);
    
    // Veritabanı bağlantısı için graceful shutdown listener
    process.on('SIGINT', async () => {
      console.log('SIGINT sinyali alındı, MongoDB bağlantısı kapatılıyor...');
      await mongoose.connection.close(false);
      console.log('MongoDB bağlantısı kapatıldı');
      process.exit(0);
    });

  } catch (error) {
    logError(`MongoDB bağlantı hatası (config/db.js): ${error.message}`, error);
    process.exit(1);
  }
};

module.exports = connectDB;
