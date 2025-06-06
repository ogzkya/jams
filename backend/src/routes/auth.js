const express = require('express');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { register, login, logout, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const router = express.Router();

/**
 * Kimlik doğrulama rotaları
 */

// Kullanıcı kaydı - Sadece USER_CREATE yetkisi
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Kullanıcı adı gerekli'),
    body('email').isEmail().withMessage('Geçerli e-posta girin'),
    body('password').isLength({ min: 6 }).withMessage('Parola en az 6 karakter'),
    body('firstName').notEmpty().withMessage('İsim gerekli'),
    body('lastName').notEmpty().withMessage('Soyisim gerekli'),
    validate
  ],
  register
);

// Kullanıcı girişi - Herkese açık
router.post(
  '/login',
  [
    body('username').optional(),
    body('email').optional(),
    body('password').notEmpty().withMessage('Parola gerekli'),
    validate
  ],
  login
);

// Kullanıcı çıkışı
router.post('/logout', protect, logout);

// GET /api/auth/me
router.get('/me', protect, getProfile);

// PUT /api/auth/profile
router.put('/profile', protect, updateProfile);

// POST /api/auth/change-password
router.post('/change-password', protect, changePassword);

// Debug endpoint'i kaldırıldı (hata kaynağı)
// router.get('/debug-admin', debugAdmin);

// Test endpoint
router.get('/system-status', (req, res) => {
  res.status(200).json({ 
    message: 'Auth sistemi çalışıyor',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
