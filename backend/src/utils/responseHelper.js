/**
 * API yanıtları için yardımcı fonksiyonlar
 */

/**
 * Başarılı yanıt oluştur
 * @param {Object} res - Express response objesi
 * @param {String} message - Başarı mesajı
 * @param {Object} data - Yanıt verisi
 * @param {Number} statusCode - HTTP durum kodu (default: 200)
 */
const successResponse = (res, message = 'İşlem başarılı', data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Hata yanıtı oluştur
 * @param {Object} res - Express response objesi
 * @param {String} message - Hata mesajı
 * @param {Number} statusCode - HTTP durum kodu
 * @param {Object} errors - Detaylı hata bilgileri
 */
const errorResponse = (res, message = 'İşlem başarısız', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors !== null) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Doğrulama hatası yanıtı
 * @param {Object} res - Express response objesi
 * @param {Array} errors - Validation hataları
 */
const validationErrorResponse = (res, errors) => {
  return errorResponse(
    res,
    'Giriş verileri geçersiz',
    400,
    Array.isArray(errors) ? errors : [errors]
  );
};

/**
 * Yetkilendirme hatası yanıtı
 * @param {Object} res - Express response objesi
 * @param {String} message - Hata mesajı
 */
const unauthorizedResponse = (res, message = 'Bu işlem için yetkiniz bulunmuyor') => {
  return errorResponse(res, message, 403);
};

/**
 * Kimlik doğrulama hatası yanıtı
 * @param {Object} res - Express response objesi
 * @param {String} message - Hata mesajı
 */
const unauthenticatedResponse = (res, message = 'Lütfen önce giriş yapınız') => {
  return errorResponse(res, message, 401);
};

/**
 * Bulunamadı hatası yanıtı
 * @param {Object} res - Express response objesi
 * @param {String} message - Hata mesajı
 */
const notFoundResponse = (res, message = 'İstenilen kaynak bulunamadı') => {
  return errorResponse(res, message, 404);
};

/**
 * Sunucu hatası yanıtı
 * @param {Object} res - Express response objesi
 * @param {String} message - Hata mesajı
 */
const serverErrorResponse = (res, message = 'Sunucu hatası oluştu') => {
  return errorResponse(res, message, 500);
};

/**
 * Sayfa bulunamadı yanıtı
 * @param {Object} res - Express response objesi
 */
const pageNotFoundResponse = (res) => {
  return errorResponse(res, 'İstenilen sayfa bulunamadı', 404);
};

/**
 * Rate limit aşıldı yanıtı
 * @param {Object} res - Express response objesi
 */
const tooManyRequestsResponse = (res) => {
  return errorResponse(res, 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin', 429);
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  unauthenticatedResponse,
  notFoundResponse,
  serverErrorResponse,
  pageNotFoundResponse,
  tooManyRequestsResponse
};
