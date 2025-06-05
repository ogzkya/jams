const express = require('express');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Token oluştur
const getToken = id => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRE
});

/**
 * Kimlik doğrulama rotaları
 */

// Kullanıcı kaydı - Sadece USER_CREATE yetkisi
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('İsim gerekli'),
    body('email').isEmail().withMessage('Geçerli e-posta girin'),
    body('password').isLength({ min: 6 }).withMessage('Parola en az 6 karakter'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error('E-posta zaten kayıtlı');
    }
    const user = await User.create({ name, email, password, role });
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: getToken(user._id)
    });
  })
);

// Kullanıcı girişi - Herkese açık
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Geçerli e-posta'),
    body('password').notEmpty().withMessage('Parola gerekli'),
    validate
  ],
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: getToken(user._id)
      });
    } else {
      res.status(401);
      throw new Error('Geçersiz e-posta veya parola');
    }
  })
);

// GET /api/auth/me
router.get('/me', protect, 
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

module.exports = router;
