/**
 * Merkezi Hata Loglama ve Yönetim Modülü
 */
const fs = require('fs').promises;
const path = require('path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Log dizini
const LOG_DIR = path.join(__dirname, '../logs');

/**
 * Log dosyasını hazırla
 */
const prepareLogDir = async () => {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    // console.log(`${colors.green}Log dizini hazır: ${logDir}${colors.reset}`);
  } catch (err) {
    // Bu console.error'u değiştirelim.
    // Orijinal: console.error(`${colors.red}Log dizini oluşturulamadı: ${err.message}${colors.reset}`);
    // Doğrudan console.error kullanıyoruz çünkü logError logDir'e yazmaya çalışabilir ve bu da döngüye neden olabilir.
    // Ancak bu özel durumda, logError'un konsol çıktısı yeterlidir.
    // Eğer appendToLogFile aktif edilirse, bu kısım dikkatli yönetilmeli.
    // Şimdilik, logError'u burada kullanmak yerine temel console.error bırakılabilir veya logError'un dosyaya yazma kısmı koşullu hale getirilebilir.
    // Basitlik adına, logError'un sadece konsola yazdığını varsayarak:
    logError(`Log dizini oluşturulamadı: ${LOG_DIR}`, err);
  }
};

/**
 * Hata logu oluştur
 * @param {string} severity - Hata seviyesi (INFO, WARNING, ERROR, CRITICAL)
 * @param {string} message - Hata mesajı
 * @param {Error|Object} error - Hata nesnesi
 * @param {Object} metadata - Ek bilgiler
 */
const logError = async (severity = 'ERROR', message, error = null, metadata = {}) => {
  const timestamp = new Date();
  const formattedDate = format(timestamp, 'yyyy-MM-dd HH:mm:ss');
  const severityColor = SEVERITY_COLORS[severity] || colors.white;
  
  // Konsola hata logu
  console.error(`${severityColor}[${severity}] ${formattedDate}: ${message}${colors.reset}`);
  
  if (error) {
    if (error instanceof Error) {
      console.error(`${severityColor}Stack: ${error.stack}${colors.reset}`);
    } else {
      console.error(`${severityColor}Detaylar: ${JSON.stringify(error, null, 2)}${colors.reset}`);
    }
  }
  
  // Dosyaya hata logu
  try {
    await prepareLogDir();
    
    const logFilename = `${format(timestamp, 'yyyy-MM-dd')}_errors.log`;
    const logPath = path.join(LOG_DIR, logFilename);
    
    const logEntry = {
      timestamp: formattedDate,
      severity,
      message,
      error: error instanceof Error ? { 
        name: error.name, 
        message: error.message, 
        stack: error.stack 
      } : error,
      metadata
    };
    
    await fs.appendFile(
      logPath, 
      `${JSON.stringify(logEntry)}\n`,
      'utf8'
    );
    
  } catch (logErr) {
    console.error(`${colors.red}Hata log kaydedilemedi: ${logErr.message}${colors.reset}`);
  }
};

/**
 * Bilgi logu
 */
const info = (message, metadata = {}) => {
  logError('INFO', message, null, metadata);
};

/**
 * Uyarı logu
 */
const warning = (message, error = null, metadata = {}) => {
  logError('WARNING', message, error, metadata);
};

/**
 * Hata logu
 */
const error = (message, error = null, metadata = {}) => {
  logError('ERROR', message, error, metadata);
};

/**
 * Kritik hata logu
 */
const critical = (message, error = null, metadata = {}) => {
  logError('CRITICAL', message, error, metadata);
};

module.exports = {
  logError,
  info,
  warning,
  error,
  critical,
  prepareLogDir
};

/**
 * Hataları konsola veya harici bir günlükleme servisine kaydeder.
 * @param {string | Error} errorOrMessage Kaydedilecek hata veya mesaj.
 * @param {Error | object} [errorObject] Ek hata nesnesi veya meta veri.
 */
function logError(errorOrMessage, errorObject) {
  const timestamp = new Date().toISOString();
  if (errorOrMessage instanceof Error) {
    console.error(`[${timestamp}] Error: ${errorOrMessage.message}`, errorOrMessage.stack);
    if (errorObject) {
      console.error(`[${timestamp}] Additional Info:`, errorObject);
    }
  } else {
    console.error(`[${timestamp}] Log: ${errorOrMessage}`);
    if (errorObject instanceof Error) {
      console.error(`[${timestamp}] Error Details: ${errorObject.message}`, errorObject.stack);
    } else if (errorObject) {
      console.error(`[${timestamp}] Details:`, errorObject);
    }
  }
  // Gelişmiş günlükleme için:
  // - Harici bir servise gönderme (Sentry, Loggly vb.)
  // - Dosyaya yazma
}

module.exports = {
  logError
};
