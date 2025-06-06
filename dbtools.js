const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { logError, colors } = require('./utils/errorLogger'); // errorLogger'ı ve colors'ı içe aktar

// Komut satırı argümanlarını al
const args = process.argv.slice(2);
const command = args[0] || 'help';

// MongoDB bağlantısı
async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jams';
    await mongoose.connect(uri);
    console.log(`${colors.green}✅ MongoDB bağlantısı başarılı: ${mongoose.connection.host}/${mongoose.connection.name}${colors.reset}`);
    return true;
  } catch (error) {
    let dbNameFromUri = 'bilinmiyor';
    try {
      const url = new URL(process.env.MONGODB_URI || 'mongodb://localhost:27017/jams');
      dbNameFromUri = url.pathname.substring(1) || 'jams'; // Pathname / ile başlar
    } catch (parseError) {
      // URI parse edilemezse, varsayılan veya genel bir ifade kullan
    }
    logError(
      'CRITICAL',
      'MongoDB bağlantı hatası',
      error.message,
      { 
        host: (process.env.MONGODB_URI || 'mongodb://localhost:27017').split('@').pop(), // Şifreyi loglamamak için
        dbName: dbNameFromUri,
        originalError: error
      }
    );
    process.exit(1);
  }
}

// Veritabanı durumunu kontrol et
async function checkStatus() {
  if (await connectDB()) {
    try {
      const stats = await mongoose.connection.db.stats();
      console.log(`${colors.bright}${colors.blue}MongoDB Durum Bilgisi:${colors.reset}`);
      console.log(`Veritabanı: ${stats.db}`);
      console.log(`Koleksiyonlar: ${stats.collections}`);
      console.log(`Dökümanlar: ${stats.objects}`); // MongoDB 5.0+ için 'documents' olabilir, eski versiyonlarda 'objects'
      console.log(`Ortalama Döküman Boyutu: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
      console.log(`Veri Boyutu: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Depolama Boyutu: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Index Boyutu: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      logError('Durum bilgisi alınamadı', error.message, error);
    } finally {
      await mongoose.connection.close();
    }
  }
}

// Demo veri oluştur
async function seedData() {
  if (await connectDB()) {
    try {
      // Modelleri yükle
      const User = require('./backend/src/models/User');
      const Location = require('./backend/src/models/Location');
      
      console.log(`${colors.yellow}Demo verisi oluşturuluyor...${colors.reset}`);
      
      // Admin kullanıcısı oluştur
      const adminExists = await User.findOne({ username: 'admin' });
      if (!adminExists) {
        console.log('Admin kullanıcısı oluşturuluyor...');
        await User.create({
          username: 'admin',
          email: 'admin@jams.com',
          password: 'admin123',
          name: 'Sistem Yöneticisi',
          roles: ['ADMIN'],
          isActive: true
        });
        console.log(`${colors.green}✅ Admin kullanıcısı oluşturuldu${colors.reset}`);
      } else {
        console.log(`${colors.yellow}Admin kullanıcısı zaten mevcut${colors.reset}`);
      }
      
      // Ana bina lokasyonu oluştur
      const mainBuildingExists = await Location.findOne({ type: 'MAIN_BUILDING' });
      if (!mainBuildingExists) {
        console.log('Ana bina lokasyonu oluşturuluyor...');
        const mainBuilding = await Location.create({
          name: 'Ana Bina',
          type: 'MAIN_BUILDING',
          code: 'MB',
          description: 'Merkez ofis binası',
          buildingInfo: {
            floors: { min: -2, max: 10 },
            sections: [
              { name: 'A', description: 'A Blok' },
              { name: 'B', description: 'B Blok' },
              { name: 'C', description: 'C Blok' }
            ]
          }
        });
        
        // Birkaç kat oluştur
        for (let i = 1; i <= 3; i++) {
          await Location.create({
            name: `${i}. Kat`,
            type: 'FLOOR',
            parent: mainBuilding._id,
            floorInfo: {
              level: i,
              section: 'A'
            }
          });
        }
        console.log(`${colors.green}✅ Ana bina ve katlar oluşturuldu${colors.reset}`);
      } else {
        console.log(`${colors.yellow}Ana bina lokasyonu zaten mevcut${colors.reset}`);
      }
      
      console.log(`${colors.green}✅ Demo verisi oluşturma tamamlandı${colors.reset}`);
    } catch (error) {
      logError('Demo veri oluşturma hatası', error.message, error);
    } finally {
      await mongoose.connection.close();
    }
  }
}

// Veritabanını temizle
async function clearDatabase() {
  if (await connectDB()) {
    try {
      const collections = await mongoose.connection.db.collections();
      
      const answer = await new Promise(resolve => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        readline.question(`${colors.red}⚠️ Bu işlem tüm veritabanını temizleyecek. Devam etmek istiyor musunuz? (evet/hayır): ${colors.reset}`, answer => {
          readline.close();
          resolve(answer.trim().toLowerCase());
        });
      });
      
      if (answer === 'evet') {
        for (const collection of collections) {
          await collection.deleteMany({});
          console.log(`${colors.yellow}${collection.collectionName} koleksiyonu temizlendi${colors.reset}`);
        }
        console.log(`${colors.green}✅ Tüm koleksiyonlar başarıyla temizlendi${colors.reset}`);
      } else {
        console.log('İşlem iptal edildi.');
      }
    } catch (error) {
      logError('Veritabanı temizleme hatası', error.message, error);
    } finally {
      await mongoose.connection.close();
    }
  }
}

// Backup oluştur
async function backupDatabase() {
  const { exec } = require('child_process');
  const moment = require('moment');
  const fs = require('fs'); // fs'i en üste almak daha iyi bir pratik
  const backupDir = path.join(__dirname, 'backups');
  
  // Backup dizinini oluştur
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true }); // recursive: true iç içe dizinler için
  }
  
  const dateStamp = moment().format('YYYY-MM-DD_HH-mm-ss'); // Daha kesin zaman damgası
  const dbName = process.env.MONGODB_URI ? 
    new URL(process.env.MONGODB_URI).pathname.substring(1) || 'jams' 
    : 'jams';
  const outputFile = path.join(backupDir, `${dbName}_${dateStamp}.gz`);
  
  console.log(`${colors.yellow}Veritabanı yedeği oluşturuluyor: ${outputFile}${colors.reset}`);
  
  const mongoUri = process.env.MONGODB_URI || `mongodb://localhost:27017/${dbName}`;
  // mongodump komutunda --uri kullanmak daha güvenli ve esnektir
  const command = `mongodump --uri="${mongoUri}" --archive=${outputFile} --gzip`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      logError('Yedekleme komutu yürütülürken hata oluştu', error.message, { command, stderr, stdout, originalError: error });
      return;
    }
    if (stderr) {
      // mongodump bazen stderr'e bilgi mesajları yazabilir, bunları uyarı olarak loglayabiliriz
      console.warn(`${colors.yellow}[Yedekleme Uyarısı] ${stderr.trim()}${colors.reset}`);
    }
    console.log(`${colors.green}✅ Veritabanı başarıyla yedeklendi: ${outputFile}${colors.reset}`);
    if (stdout) {
      console.log(`[Yedekleme Bilgisi] ${stdout.trim()}`);
    }
  });
}

// Yardım menüsü
function showHelp() {
  console.log(`${colors.bright}${colors.cyan}JAMS Veritabanı Araçları${colors.reset}`);
  console.log('\nKullanım: node dbtools.js [komut]');
  console.log('\nKomutlar:');
  console.log('  status     - Veritabanı durumunu görüntüle');
  console.log('  seed       - Demo veri oluştur');
  console.log('  clear      - Veritabanını temizle (tüm verileri siler)');
  console.log('  backup     - Veritabanı yedeği oluştur');
  console.log('  help       - Bu yardım menüsünü göster');
}

// Komutları yürüt
async function run() {
  switch(command) {
    case 'status':
      await checkStatus();
      break;
    case 'seed':
      await seedData();
      break;
    case 'clear':
      await clearDatabase();
      break;
    case 'backup':
      await backupDatabase();
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

// Ana fonksiyonu çalıştır
run().catch(error => {
  logError('dbtools ana işlem sırasında beklenmedik bir hata oluştu', error.message, error);
  process.exit(1);
});
