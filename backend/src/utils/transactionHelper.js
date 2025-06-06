/**
 * MongoDB işlem (transaction) yardımcıları
 */
const mongoose = require('mongoose');
const { logError } = require('../../../utils/errorLogger');

/**
 * MongoDB transaction ile bir dizi veritabanı işlemi gerçekleştir
 * @param {Function} dbOperations - Transaction içinde yapılacak işlemleri içeren async fonksiyon
 * @param {Object} options - Transaction seçenekleri
 * @returns {Promise} İşlem sonucu
 */
async function executeTransaction(dbOperations, options = {}) {
  // Varsayılan seçenekleri ayarla
  const defaultOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000
  };

  const transactionOptions = { ...defaultOptions, ...options };
  
  const session = await mongoose.startSession();
  let result = null;
  let retries = 0;
  let success = false;
  
  while (retries < transactionOptions.maxRetries && !success) {
    try {
      session.startTransaction();
      
      // Timeout ile işlemleri çalıştır
      result = await Promise.race([
        dbOperations(session),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), transactionOptions.timeout)
        )
      ]);
      
      await session.commitTransaction();
      success = true;
      
    } catch (error) {
      await session.abortTransaction();
      
      // TransientTransactionError veya WriteConcernError ise yeniden dene
      if (error.errorLabels && 
          (error.errorLabels.includes('TransientTransactionError') || 
           error.errorLabels.includes('WriteConcernError'))) {
        
        retries++;
        if (retries < transactionOptions.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, transactionOptions.retryDelay));
          continue;
        }
      }
      
      // Diğer hatalarda veya yeniden deneme sınırına ulaşıldığında hata fırlat
      logError('ERROR', 'Veritabanı işlemi başarısız oldu', error, { retries });
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  return result;
}

/**
 * MongoDB belge (document) ilişkilerini yönet
 * @param {Object} model - Mongoose model
 * @param {Object} document - İlişkileri kurulacak döküman
 * @param {Array} relationFields - İlişki alanları
 * @returns {Promise} İlişkileri kurulmuş döküman
 */
async function populateRelations(model, document, relationFields) {
  try {
    if (!document) {
      return null;
    }
    
    const populatedDoc = Array.isArray(document) 
      ? await model.populate(document, relationFields)
      : await model.populate(document, relationFields);
      
    return populatedDoc;
    
  } catch (error) {
    logError('ERROR', 'İlişkileri getirme hatası', error, { 
      model: model.modelName, 
      documentId: document._id 
    });
    throw error;
  }
}

module.exports = {
  executeTransaction,
  populateRelations
};
