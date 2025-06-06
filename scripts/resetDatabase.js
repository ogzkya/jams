const mongoose = require('mongoose');
const path = require('path');
const { logError } = require('../utils/errorLogger'); // errorLogger'ı içe aktar

// Backend'deki .env dosyasını yükle
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function resetDatabase() {
  try {
    console.log('🔗 MongoDB\'ye bağlanılıyor...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // Tüm koleksiyonları sil
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('🗑️  Mevcut koleksiyonlar siliniyor...');
    for (const collection of collections) {
      await db.dropCollection(collection.name);
      console.log(`   ✅ ${collection.name} koleksiyonu silindi`);
    }
    
    console.log('🎉 Veritabanı tamamen temizlendi');
    
  } catch (error) {
    logError('Veritabanı sıfırlama hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
resetDatabase();
