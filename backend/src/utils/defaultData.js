const Role = require('../models/Role');
const { logError, logWarning } = require('../../../utils/errorLogger'); // errorLogger'ı içe aktar

/**
 * Varsayılan rolleri oluşturur
 */
const initializeDefaultRoles = async () => {
  try {
    console.log('Roller kontrol ediliyor...');
    
    // Daha güvenli yaklaşım: timeout ile sorgu
    const countPromise = Role.countDocuments().maxTimeMS(10000);
    let existingRoles;
    
    try {
      existingRoles = await countPromise;
      console.log(`Mevcut rol sayısı: ${existingRoles}`);
    } catch (error) {
      logWarning('Rol sayısı kontrol edilemedi, varsayılan roller oluşturuluyor:', { errorMessage: error.message });
      existingRoles = 0; // Hata durumunda varsayılan rolleri oluştur
    }
    
    if (existingRoles === 0) {
      console.log('Varsayılan roller oluşturuluyor...');
      
      const defaultRoles = [
        {
          name: 'ADMIN',
          displayName: 'Sistem Yöneticisi',
          description: 'Tüm sistem yetkilerine sahip süper kullanıcı',
          permissions: {
            users: { create: true, read: true, update: true, delete: true },
            inventory: { create: true, read: true, update: true, delete: true, qr_generate: true, export: true },
            locations: { create: true, read: true, update: true, delete: true, floor_plans: true },
            passwords: { create: true, read: true, update: true, delete: true, decrypt: true },
            servers: { read: true, execute_scripts: true, system_info: true, logs: true },
            audit: { read: true, export: true },
            system: { backup: true, settings: true, maintenance: true }
          },
          isDefault: true
        },
        {
          name: 'SYSTEM_ADMIN',
          displayName: 'Sistem Yöneticisi',
          description: 'Sistem yönetimi ve teknik operasyonlar yetkisi',
          permissions: {
            users: { create: false, read: true, update: false, delete: false },
            inventory: { create: true, read: true, update: true, delete: false, qr_generate: true, export: true },
            locations: { create: true, read: true, update: true, delete: false, floor_plans: true },
            passwords: { create: true, read: true, update: true, delete: false, decrypt: true },
            servers: { read: true, execute_scripts: true, system_info: true, logs: true },
            audit: { read: true, export: false },
            system: { backup: false, settings: false, maintenance: true }
          },
          isDefault: true
        },
        {
          name: 'TECH_SUPPORT',
          displayName: 'Teknik Destek',
          description: 'Teknik destek ve envanter yönetimi yetkisi',
          permissions: {
            users: { create: false, read: true, update: false, delete: false },
            inventory: { create: true, read: true, update: true, delete: false, qr_generate: true, export: false },
            locations: { create: false, read: true, update: false, delete: false, floor_plans: false },
            passwords: { create: false, read: true, update: false, delete: false, decrypt: false },
            servers: { read: true, execute_scripts: false, system_info: true, logs: false },
            audit: { read: false, export: false },
            system: { backup: false, settings: false, maintenance: false }
          },
          isDefault: true
        },
        {
          name: 'DEPARTMENT_MANAGER',
          displayName: 'Departman Yöneticisi',
          description: 'Departman bazlı envanter ve kullanıcı görüntüleme yetkisi',
          permissions: {
            users: { create: false, read: true, update: false, delete: false },
            inventory: { create: false, read: true, update: false, delete: false, qr_generate: false, export: false },
            locations: { create: false, read: true, update: false, delete: false, floor_plans: false },
            passwords: { create: false, read: false, update: false, delete: false, decrypt: false },
            servers: { read: false, execute_scripts: false, system_info: false, logs: false },
            audit: { read: false, export: false },
            system: { backup: false, settings: false, maintenance: false }
          },
          isDefault: true
        },
        {
          name: 'OBSERVER',
          displayName: 'Gözlemci',
          description: 'Sadece görüntüleme yetkisi olan kullanıcı',
          permissions: {
            users: { create: false, read: false, update: false, delete: false },
            inventory: { create: false, read: true, update: false, delete: false, qr_generate: false, export: false },
            locations: { create: false, read: true, update: false, delete: false, floor_plans: false },
            passwords: { create: false, read: false, update: false, delete: false, decrypt: false },
            servers: { read: false, execute_scripts: false, system_info: false, logs: false },
            audit: { read: false, export: false },
            system: { backup: false, settings: false, maintenance: false }
          },
          isDefault: true
        }
      ];

      await Role.insertMany(defaultRoles);
      console.log('Varsayılan roller başarıyla oluşturuldu');
    } else {
      console.log('Roller zaten mevcut, yeni rol oluşturulmadı');
    }
  } catch (error) {
    logError('Varsayılan rol oluşturma hatası:', error);
    throw error;
  }
};

const initializeDefaultAdmin = async () => {
  try {
    const User = require('../models/User');
    
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (!existingAdmin) {
      console.log('Varsayılan admin kullanıcısı oluşturuluyor...');
      
      const adminRole = await Role.findOne({ name: 'ADMIN' });
      
      if (!adminRole) {
        throw new Error('Admin rolü bulunamadı');
      }
      
      const defaultAdmin = new User({
        username: 'admin',
        email: 'admin@company.com',
        password: 'Admin123!',
        firstName: 'Sistem',
        lastName: 'Yöneticisi',
        roles: [adminRole._id],
        department: 'IT',
        position: 'Sistem Yöneticisi',
        isActive: true
      });
      
      await defaultAdmin.save();
      console.log('Varsayılan admin kullanıcısı oluşturuldu');
      console.log('Kullanıcı adı: admin');
      console.log('Şifre: Admin123!');
      console.log('ÖNEMLİ: İlk girişten sonra şifreyi değiştirin!');
    }
  } catch (error) {
    logError('Varsayılan admin oluşturma hatası:', error);
  }
};

/**
 * Tüm varsayılan verileri oluşturur
 */
const initializeDefaultData = async () => {
  await initializeDefaultRoles();
  await initializeDefaultAdmin();
};

module.exports = {
  initializeDefaultRoles,
  initializeDefaultAdmin,
  initializeDefaultData
};
