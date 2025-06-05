const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB'ye bağlan
async function initializeDatabase() {
  try {
    console.log('MongoDB\'ye bağlanılıyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kurumsal_yonetim_platform', {
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
    
    // Default roles oluştur
    await createDefaultRoles();
    
    console.log('🎉 Veritabanı initialization tamamlandı');
    
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

async function createDefaultRoles() {
  try {
    const Role = require('../src/models/Role');
    
    // Varsayılan roller
    const defaultRoles = [
      {
        name: 'ADMIN',
        displayName: 'Sistem Yöneticisi',
        description: 'Tüm sistem yetkilerine sahip',
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          inventory: { create: true, read: true, update: true, delete: true },
          locations: { create: true, read: true, update: true, delete: true },
          passwords: { create: true, read: true, update: true, delete: true },
          servers: { create: true, read: true, update: true, delete: true },
          audit: { create: true, read: true, update: true, delete: true }
        },
        isSystemRole: true,
        isActive: true
      },
      {
        name: 'USER',
        displayName: 'Kullanıcı',
        description: 'Temel kullanıcı yetkileri',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          inventory: { create: false, read: true, update: false, delete: false },
          locations: { create: false, read: true, update: false, delete: false },
          passwords: { create: false, read: false, update: false, delete: false },
          servers: { create: false, read: false, update: false, delete: false },
          audit: { create: false, read: false, update: false, delete: false }
        },
        isSystemRole: true,
        isActive: true
      },
      {
        name: 'OBSERVER',
        displayName: 'Gözlemci',
        description: 'Sadece görüntüleme yetkisi',
        permissions: {
          users: { create: false, read: true, update: false, delete: false },
          inventory: { create: false, read: true, update: false, delete: false },
          locations: { create: false, read: true, update: false, delete: false },
          passwords: { create: false, read: false, update: false, delete: false },
          servers: { create: false, read: false, update: false, delete: false },
          audit: { create: false, read: false, update: false, delete: false }
        },
        isSystemRole: true,
        isActive: true
      }
    ];
    
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`✅ ${roleData.name} rolü oluşturuldu`);
      } else {
        console.log(`ℹ️  ${roleData.name} rolü zaten mevcut`);
      }
    }
    
  } catch (error) {
    console.error('❌ Rol oluşturma hatası:', error);
  }
}

// Script'i çalıştır
initializeDatabase();
