const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { colors, logError } = require('./utils/errorLogger'); // logError'ı ve colors'ı içe aktar

console.log(`${colors.bright}${colors.green}=== JAMS Platform Başlatılıyor ===${colors.reset}`);

// MongoDB'nin çalışıp çalışmadığını kontrol et
async function checkMongoDB() {
  try {
    const { MongoClient } = require('mongodb');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jams';
    // Zaman aşımını biraz artırabiliriz, örneğin 5 saniye
    const client = new MongoClient(uri, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
    await client.connect();
    await client.db().admin().ping(); // Ping ile bağlantıyı doğrula
    await client.close();
    return true;
  } catch (error) {
    // Hata detayını loglamak faydalı olabilir ama checkMongoDB'nin amacı sadece true/false dönmek.
    // console.warn(`${colors.yellow}MongoDB kontrol hatası: ${error.message}${colors.reset}`);
    return false;
  }
}

// Backend ve Frontend süreçlerini başlat
async function startServices() {
  try {
    // MongoDB bağlantısını kontrol et
    const isMongoDBRunning = await checkMongoDB();
    if (!isMongoDBRunning) {
      console.log(`${colors.yellow}⚠️ MongoDB bağlantısı kurulamadı veya yanıt vermiyor. MongoDB servisinin çalıştığından ve erişilebilir olduğundan emin olun.${colors.reset}`);
      // İsteğe bağlı: MongoDB çalışmıyorsa başlatmayı durdurabiliriz.
      // process.exit(1); 
    } else {
      console.log(`${colors.green}✅ MongoDB bağlantısı başarılı ve yanıt veriyor.${colors.reset}`);
    }

    // Backend'i başlat
    console.log(`${colors.cyan}🚀 Backend başlatılıyor...${colors.reset}`);
    const backendProcess = spawn('npm', ['run', 'dev'], { 
      cwd: path.join(__dirname, 'backend'),
      shell: true,
      stdio: 'pipe'
    });

    // Backend çıktılarını işle
    backendProcess.stdout.on('data', (data) => {
      console.log(`${colors.blue}[Backend] ${colors.reset}${data.toString().trim()}`);
    });
    backendProcess.stderr.on('data', (data) => {
      logError(`[Backend Error] ${data.toString().trim()}`);
    });

    // Frontend'i başlat
    console.log(`${colors.magenta}🚀 Frontend başlatılıyor...${colors.reset}`);
    const frontendProcess = spawn('npm', ['start'], { 
      cwd: path.join(__dirname, 'client'),
      shell: true,
      stdio: 'pipe'
    });

    // Frontend çıktılarını işle
    frontendProcess.stdout.on('data', (data) => {
      console.log(`${colors.magenta}[Frontend] ${colors.reset}${data.toString().trim()}`);
    });
    frontendProcess.stderr.on('data', (data) => {
      logError(`[Frontend Error] ${data.toString().trim()}`); // console.error yerine logError kullanıldı
    });

    // Süreç sonlandırma işleyicisi
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}Süreçler sonlandırılıyor...${colors.reset}`);
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    logError('Servisler başlatılırken hata oluştu', error);
    process.exit(1);
  }
}

// Servisleri başlat
startServices();
