const mongoose = require('mongoose');
const path = require('path');

// Backend'deki .env dosyasını yükle
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// MongoDB'ye bağlan
async function initializeDatabase() {
  try {
    console.log('MongoDB\'ye bağlanılıyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ MongoDB bağlantısı başarılı');
    
    // Veritabanı ve koleksiyonları oluştur
    const db = mongoose.connection.db;
    console.log('📁 Veritabanı adı:', db.databaseName);
    
    // Koleksiyonları listele
    const collections = await db.listCollections().toArray();
    console.log('📋 Mevcut koleksiyonlar:', collections.map(c => c.name));
    
    // Temel koleksiyonları oluştur (eğer yoksa)
    const requiredCollections = ['users', 'roles', 'devices', 'locations', 'auditlogs', 'servers'];
    
    for (const collectionName of requiredCollections) {
      const collectionExists = collections.some(c => c.name === collectionName);
      if (!collectionExists) {
        await db.createCollection(collectionName);
        console.log(`✅ ${collectionName} koleksiyonu oluşturuldu`);
      } else {
        console.log(`ℹ️  ${collectionName} koleksiyonu zaten mevcut`);
      }
    }
    
    // Default data oluştur
    const { initializeDefaultData } = require('../backend/src/utils/defaultData');
    await initializeDefaultData();
    
    console.log('🎉 Veritabanı initialization tamamlandı');
    
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
initializeDatabase();
