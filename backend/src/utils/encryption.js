const crypto = require('crypto');
const { logError } = require('../../../utils/errorLogger');

// Şifreleme algoritması
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES blok boyutu
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Environment'tan encryption key'i al ve key derive et
 */
const getKey = (salt) => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable gereklidir');
  }
  return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');
};

/**
 * Metni şifreler
 * @param {string} text - Şifrelenecek metin
 * @returns {string} - Base64 encoded şifreli metin
 */
const encrypt = (text) => {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(salt);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Salt + IV + Tag + Encrypted data birleştir
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return result.toString('base64');
  } catch (error) {
    logError('ERROR', 'Şifreleme hatası', error, { textLength: text?.length });
    throw new Error('Şifreleme hatası: ' + error.message);
  }
};

/**
 * Şifrelenmiş metni çözer
 * @param {string} encryptedData - Base64 encoded şifreli metin
 * @returns {string} - Çözülmüş metin
 */
const decrypt = (encryptedData) => {
  try {
    const data = Buffer.from(encryptedData, 'base64');
    
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, TAG_POSITION);
    const tag = data.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.slice(ENCRYPTED_POSITION);
    
    const key = getKey(salt);
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(salt);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Şifre çözme hatası: ' + error.message);
  }
};

/**
 * Hash oluşturur (şifreler için)
 * @param {string} text - Hash'lenecek metin
 * @returns {string} - SHA-256 hash
 */
const hash = (text) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Güvenli rastgele token oluşturur
 * @param {number} length - Token uzunluğu (byte)
 * @returns {string} - Hex encoded token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Güçlü şifre oluşturur
 * @param {number} length - Şifre uzunluğu
 * @param {boolean} includeSymbols - Semboller dahil edilsin mi
 * @returns {string} - Güçlü şifre
 */
const generatePassword = (length = 12, includeSymbols = true) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let charset = lowercase + uppercase + numbers;
  if (includeSymbols) {
    charset += symbols;
  }
  
  let password = '';
  
  // En az bir karakter her tipten olsun
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  if (includeSymbols) {
    password += symbols[Math.floor(Math.random() * symbols.length)];
  }
  
  // Geri kalan karakterleri rastgele seç
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Karakterleri karıştır
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Şifre gücünü kontrol eder
 * @param {string} password - Kontrol edilecek şifre
 * @returns {object} - Şifre gücü analizi
 */
const checkPasswordStrength = (password) => {
  const checks = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSymbols: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    noCommonPatterns: !/^(password|123456|qwerty|admin)/i.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  let strength = 'Çok Zayıf';
  if (score >= 6) strength = 'Çok Güçlü';
  else if (score >= 5) strength = 'Güçlü';
  else if (score >= 4) strength = 'Orta';
  else if (score >= 3) strength = 'Zayıf';
  
  return {
    score,
    strength,
    checks,
    suggestions: getSuggestions(checks)
  };
};

/**
 * Şifre iyileştirme önerileri
 */
const getSuggestions = (checks) => {
  const suggestions = [];
  
  if (!checks.minLength) suggestions.push('En az 8 karakter kullanın');
  if (!checks.hasLowercase) suggestions.push('Küçük harf ekleyin');
  if (!checks.hasUppercase) suggestions.push('Büyük harf ekleyin');
  if (!checks.hasNumbers) suggestions.push('Rakam ekleyin');
  if (!checks.hasSymbols) suggestions.push('Özel karakter ekleyin');
  if (!checks.noCommonPatterns) suggestions.push('Yaygın şifreleri kullanmayın');
  
  return suggestions;
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateToken,
  generatePassword,
  checkPasswordStrength
};
