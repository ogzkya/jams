/**
 * MongoDB bağlantı testi
 */
require('dotenv').config();
const { testMongoDBConnection, testMongooseConnection } = require('../utils/dbTester');
const { logError, colors } = require('../utils/errorLogger'); // errorLogger'ı ve colors'ı içe aktar

async function testDatabase() {
  console.log(`${colors.blue}===== Veritabanı Bağlantı Testi =====${colors.reset}`);
  
  try {
    // MongoDB bağlantı testi
    console.log(`${colors.yellow}MongoDB bağlantısı test ediliyor...${colors.reset}`);
    const mongoResult = await testMongoDBConnection();
    
    if (mongoResult.success) {
      console.log(`${colors.green}MongoDB bağlantısı başarılı${colors.reset}`);
      console.log(`${colors.green}Veritabanı: ${mongoResult.database}${colors.reset}`);
      console.log(`${colors.green}Koleksiyonlar: ${mongoResult.collections.join(', ')}${colors.reset}`);
    } else {
      logError(`MongoDB bağlantı hatası: ${mongoResult.error?.message}`);
    }
    
    // Mongoose bağlantı testi
    console.log(`\n${colors.yellow}Mongoose bağlantısı test ediliyor...${colors.reset}`);
    const mongooseResult = await testMongooseConnection();
    
    if (mongooseResult) {
      console.log(`${colors.green}Mongoose bağlantısı başarılı${colors.reset}`);
    } else {
      logError(`Mongoose bağlantı hatası`);
    }
    
  } catch (error) {
    logError('Veritabanı testi sırasında genel hata:', error);
  }
}

// Script doğrudan çalıştırıldıysa testi başlat
if (require.main === module) {
  testDatabase()
    .then(() => {
      console.log(`${colors.blue}===== Test Tamamlandı =====${colors.reset}`);
      process.exit(0);
    })
    .catch(error => {
      logError(`Test başarısız: ${error.message}`);
      process.exit(1);
    });
}

module.exports = testDatabase;
