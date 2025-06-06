/**
 * MongoDB Bağlantı Test Modülü
 */
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const { logError } = require('./errorLogger');
const colors = require('./colors');

/**
 * MongoDB bağlantısını test et
 * @param {string} uri - MongoDB bağlantı adresi
 * @param {Object} options - Bağlantı seçenekleri
 * @returns {Promise<Object>} Test sonuçları
 */
const testMongoDBConnection = async (uri = null, options = {}) => {
  const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/jams';
  const defaultOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 5000, // 5 saniye
    serverSelectionTimeoutMS: 5000 // 5 saniye
  };
  
  const connectionOptions = { ...defaultOptions, ...options };
  const testResults = {
    success: false,
    latency: 0,
    host: null,
    database: null,
    collections: [],
    indexes: {},
    error: null,
    serverStatus: null
  };
  
  let client = null;
  
  try {
    console.log(`${colors.blue}MongoDB bağlantısı test ediliyor: ${connectionUri}${colors.reset}`);
    const startTime = Date.now();
    
    // Doğrudan MongoClient kullanarak bağlanmayı dene
    client = new MongoClient(connectionUri, connectionOptions);
    await client.connect();
    
    // Bağlantı başarılı, gecikme süresini hesapla
    const endTime = Date.now();
    testResults.latency = endTime - startTime;
    testResults.success = true;
    
    // Bağlantı bilgilerini al
    const db = client.db();
    testResults.host = client.options.hosts.join(',');
    testResults.database = db.databaseName;
    
    // Koleksiyonları listele
    const collections = await db.listCollections().toArray();
    testResults.collections = collections.map(c => c.name);
    
    // Her koleksiyon için indeksleri kontrol et
    for (const collection of testResults.collections) {
      const indexes = await db.collection(collection).indexes();
      testResults.indexes[collection] = indexes;
    }
    
    // Sunucu durumunu al
    testResults.serverStatus = await db.command({ serverStatus: 1 });
    
    console.log(`${colors.green}MongoDB bağlantı testi başarılı:${colors.reset}`);
    console.log(`${colors.green}  - Sunucu: ${testResults.host}${colors.reset}`);
    console.log(`${colors.green}  - Veritabanı: ${testResults.database}${colors.reset}`);
    console.log(`${colors.green}  - Gecikme: ${testResults.latency}ms${colors.reset}`);
    console.log(`${colors.green}  - Koleksiyonlar: ${testResults.collections.length}${colors.reset}`);
    
  } catch (error) {
    testResults.success = false;
    testResults.error = {
      message: error.message,
      code: error.code,
      name: error.name
    };
    
    logError(
      'ERROR', 
      'MongoDB bağlantı testi başarısız', 
      error, 
      { connectionUri: connectionUri.replace(/:[^\/]+@/, ':****@') }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
  
  return testResults;
};

/**
 * Mongoose bağlantısını test et
 * @param {string} uri - MongoDB bağlantı adresi
 * @param {Object} options - Bağlantı seçenekleri
 * @returns {Promise<boolean>} Test sonucu
 */
const testMongooseConnection = async (uri = null, options = {}) => {
  const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/jams';
  const connectionOptions = { 
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 5000, 
    serverSelectionTimeoutMS: 5000,
    ...options 
  };
  
  try {
    console.log(`${colors.blue}Mongoose bağlantısı test ediliyor...${colors.reset}`);
    
    if (mongoose.connection.readyState === 1) {
      console.log(`${colors.green}Mongoose zaten bağlı${colors.reset}`);
      return true;
    }
    
    await mongoose.connect(connectionUri, connectionOptions);
    console.log(`${colors.green}Mongoose bağlantı testi başarılı${colors.reset}`);
    
    await mongoose.connection.close();
    return true;
    
  } catch (error) {
    logError(
      'ERROR', 
      'Mongoose bağlantı testi başarısız', 
      error, 
      { connectionUri: connectionUri.replace(/:[^\/]+@/, ':****@') }
    );
    return false;
  }
};

/**
 * Basit MongoDB bağlantı testi
 * @returns {Promise<{status: string, message: string, error?: any}>} Bağlantı durumu
 */
async function simpleTestMongoDBConnection() {
  try {
    if (mongoose.connection.readyState === 1) {
      // Mevcut bağlantıyı kullanarak bir ping komutu gönder
      await mongoose.connection.db.admin().ping();
      return { status: 'OK', message: 'MongoDB bağlantısı başarılı ve aktif.' };
    } else {
      // Yeni bir bağlantı kurmayı dene (eğer ana bağlantı henüz kurulmadıysa veya koptuysa)
      // Bu genellikle ana uygulama başlatılırken yapılır, bu yüzden burada sadece mevcut durumu kontrol etmek daha iyi olabilir.
      // Ancak, bağımsız bir test için geçici bir bağlantı da düşünülebilir.
      // Şimdilik, sadece hazır durumu kontrol edelim.
      return { status: 'DEGRADED', message: `MongoDB bağlantısı hazır değil. Durum: ${mongoose.connection.readyState}` };
    }
  } catch (error) {
    return { status: 'ERROR', message: 'MongoDB bağlantı testi başarısız.', error: error.message };
  }
}

module.exports = {
  testMongoDBConnection,
  testMongooseConnection,
  simpleTestMongoDBConnection
};
