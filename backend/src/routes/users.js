const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

/**
 * Kullanıcı yönetimi rotaları
 */

// Tüm kullanıcıları listele - Admin rolü gerekli
router.get(
  '/',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const users = await User.find().select('-password');
    res.json(users);
  })
);

// Kullanıcı rolünü güncelle - Admin rolü gerekli
router.put(
  '/:id',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
    user.role = role;
    await user.save();
    await AuditLog.create({
      user: req.user._id,
      action: 'update',
      resourceType: 'User',
      resourceId: user._id,
      details: { role }
    });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  })
);

// Kullanıcı sil (soft delete) - Admin rolü gerekli
router.delete(
  '/:id',
  protect,
  authorize('Admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
    await AuditLog.create({
      user: req.user._id,
      action: 'delete',
      resourceType: 'User',
      resourceId: user._id
    });
    res.json({ mesaj: 'Kullanıcı silindi' });
  })
);

module.exports = router;
