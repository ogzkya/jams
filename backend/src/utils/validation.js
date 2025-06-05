const { body, param, query } = require('express-validator');

/**
 * Kullanıcı validation kuralları
 */
const userValidations = {
  // Kullanıcı kaydı
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Kullanıcı adı 3-50 karakter arasında olmalıdır')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'),
    
    body('email')
      .isEmail()
      .withMessage('Geçerli bir e-posta adresi giriniz')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Şifre en az 6 karakter olmalıdır')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
    
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('Ad gereklidir')
      .isLength({ max: 50 })
      .withMessage('Ad en fazla 50 karakter olabilir'),
    
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Soyad gereklidir')
      .isLength({ max: 50 })
      .withMessage('Soyad en fazla 50 karakter olabilir'),
    
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Departman adı en fazla 100 karakter olabilir'),
    
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Pozisyon en fazla 100 karakter olabilir'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Geçerli bir telefon numarası giriniz')
  ],

  // Kullanıcı girişi
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Kullanıcı adı gereklidir'),
    
    body('password')
      .notEmpty()
      .withMessage('Şifre gereklidir')
  ],

  // Kullanıcı güncelleme
  update: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Geçerli bir e-posta adresi giriniz')
      .normalizeEmail(),
    
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Ad boş olamaz')
      .isLength({ max: 50 })
      .withMessage('Ad en fazla 50 karakter olabilir'),
    
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Soyad boş olamaz')
      .isLength({ max: 50 })
      .withMessage('Soyad en fazla 50 karakter olabilir'),
    
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Departman adı en fazla 100 karakter olabilir'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Geçerli bir telefon numarası giriniz')
  ],

  // Şifre değiştirme
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Mevcut şifre gereklidir'),
    
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Yeni şifre en az 6 karakter olmalıdır')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Yeni şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Şifre onayı eşleşmiyor');
        }
        return true;
      })
  ]
};

/**
 * Cihaz validation kuralları
 */
const deviceValidations = {
  // Cihaz oluşturma
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Cihaz adı gereklidir')
      .isLength({ max: 100 })
      .withMessage('Cihaz adı en fazla 100 karakter olabilir'),
    
    body('type')
      .notEmpty()
      .withMessage('Cihaz tipi gereklidir')
      .isIn(['COMPUTER', 'LAPTOP', 'SERVER', 'PRINTER', 'SCANNER', 'IP_PHONE', 'SWITCH', 'ROUTER', 'FIREWALL', 'ACCESS_POINT', 'UPS', 'MONITOR', 'PROJECTOR', 'OTHER'])
      .withMessage('Geçersiz cihaz tipi'),
    
    body('category')
      .notEmpty()
      .withMessage('Kategori gereklidir')
      .isIn(['IT_HARDWARE', 'NETWORK_EQUIPMENT', 'OFFICE_EQUIPMENT', 'SECURITY_EQUIPMENT', 'AUDIO_VIDEO', 'OTHER'])
      .withMessage('Geçersiz kategori'),
    
    body('serialNumber')
      .trim()
      .notEmpty()
      .withMessage('Seri numarası gereklidir'),
    
    body('location.current')
      .notEmpty()
      .withMessage('Lokasyon gereklidir')
      .isMongoId()
      .withMessage('Geçersiz lokasyon ID'),
    
    body('networkInfo.ipAddress')
      .optional()
      .isIP()
      .withMessage('Geçerli bir IP adresi giriniz'),
    
    body('networkInfo.macAddress')
      .optional()
      .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
      .withMessage('Geçerli bir MAC adresi giriniz'),
    
    body('procurement.purchaseDate')
      .optional()
      .isISO8601()
      .withMessage('Geçerli bir tarih giriniz'),
    
    body('procurement.warrantyEndDate')
      .optional()
      .isISO8601()
      .withMessage('Geçerli bir tarih giriniz')
  ],

  // Cihaz güncelleme
  update: [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Cihaz adı boş olamaz')
      .isLength({ max: 100 })
      .withMessage('Cihaz adı en fazla 100 karakter olabilir'),
    
    body('networkInfo.ipAddress')
      .optional()
      .isIP()
      .withMessage('Geçerli bir IP adresi giriniz'),
    
    body('networkInfo.macAddress')
      .optional()
      .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
      .withMessage('Geçerli bir MAC adresi giriniz')
  ]
};

/**
 * Lokasyon validation kuralları
 */
const locationValidations = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Lokasyon adı gereklidir')
      .isLength({ max: 100 })
      .withMessage('Lokasyon adı en fazla 100 karakter olabilir'),
    
    body('type')
      .notEmpty()
      .withMessage('Lokasyon tipi gereklidir')
      .isIn(['MAIN_BUILDING', 'REMOTE_SITE', 'FLOOR', 'SECTION', 'ROOM', 'DEPARTMENT', 'UNIT'])
      .withMessage('Geçersiz lokasyon tipi'),
    
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Lokasyon kodu gereklidir')
      .isLength({ max: 20 })
      .withMessage('Lokasyon kodu en fazla 20 karakter olabilir'),
    
    body('parent')
      .optional()
      .isMongoId()
      .withMessage('Geçersiz parent ID')
  ]
};

/**
 * Genel validation kuralları
 */
const commonValidations = {
  // MongoDB ObjectId
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Geçersiz ID formatı')
  ],

  // Sayfalama
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Sayfa numarası pozitif bir sayı olmalıdır'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit 1-100 arasında olmalıdır'),
    
    query('sort')
      .optional()
      .isIn(['asc', 'desc', '1', '-1'])
      .withMessage('Sıralama asc, desc, 1 veya -1 olmalıdır')
  ],

  // Arama
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Arama terimi 1-100 karakter arasında olmalıdır')
  ]
};

module.exports = {
  userValidations,
  deviceValidations,
  locationValidations,
  commonValidations
};
