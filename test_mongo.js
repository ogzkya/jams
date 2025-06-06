const mongoose = require('mongoose');
const { logError } = require('./utils/errorLogger'); // errorLogger'ı içe aktar
require('dotenv').config({ path: './backend/.env' });

console.log('MongoDB bağlantısı test ediliyor...');
console.log('URI:', process.env.MONGODB_URI);

// Mongoose ayarları
mongoose.set('strictQuery', false);

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Daha makul bir zaman aşımı
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000, // Bağlantı denemesi için zaman aşımı
})
.then(() => {
  console.log('✅ MongoDB bağlantısı başarılı');
  console.log('Veritabanı:', mongoose.connection.name);
  console.log('Bağlantı durumu:', mongoose.connection.readyState);
  
  // Test sorgusu
  return mongoose.connection.db.admin().ping();
})
.then(() => {
  console.log('✅ MongoDB ping başarılı');
  mongoose.connection.close(() => {
    console.log('MongoDB bağlantısı kapatıldı.');
    process.exit(0);
  });
})
.catch((error) => {
  logError('MongoDB bağlantı veya ping hatası', error.message, error); // logError kullanıldı
  // mongoose.connection.close() çağrısı burada gereksiz olabilir çünkü bağlantı zaten kurulamamış olabilir.
  // Ancak yine de denemekte fayda var, eğer bağlantı kısmen kurulduysa.
  if (mongoose.connection && mongoose.connection.readyState !== 0) { // 0 = disconnected
    mongoose.connection.close(() => {
      console.log('MongoDB bağlantısı kapatıldı (hata sonrası).');
      process.exit(1);
    });
  } else {
    process.exit(1); // Hata durumunda çıkış kodu 1
  }
});
