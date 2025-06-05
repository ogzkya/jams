const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const Credential = require('../models/Credential');
const AuditLog = require('../models/AuditLog');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();

// CREATE credential
router.post(
  '/',
  protect,
  authorize('Admin','SistemYonetici'),
  asyncHandler(async (req, res) => {
    const { title, username, password, url, notes } = req.body;
    const encrypted = encrypt(password);
    const cred = await Credential.create({
      title, username, password: encrypted, url, notes, createdBy: req.user._id
    });
    await AuditLog.create({
      user: req.user._id,
      action: 'create',
      resourceType: 'Credential',
      resourceId: cred._id,
      ip: req.ip
    });
    res.status(201).json({ id: cred._id, title, username, url, notes });
  })
);

// READ all credentials (metadata only)
router.get(
  '/',
  protect,
  authorize('Admin','SistemYonetici','TeknikDestek'),
  asyncHandler(async (req, res) => {
    const list = await Credential.find()
      .select('-password')
      .populate('createdBy', 'name email');
    res.json(list);
  })
);

// READ a single credential (decrypt password)
router.get(
  '/:id',
  protect,
  authorize('Admin','SistemYonetici','TeknikDestek'),
  asyncHandler(async (req, res) => {
    const cred = await Credential.findById(req.params.id).select('+password');
    if (!cred) {
      res.status(404);
      throw new Error('Credential bulunamadı');
    }
    const decrypted = decrypt(cred.password);
    await AuditLog.create({
      user: req.user._id,
      action: 'read',
      resourceType: 'Credential',
      resourceId: cred._id,
      ip: req.ip
    });
    res.json({
      id: cred._id,
      title: cred.title,
      username: cred.username,
      password: decrypted,
      url: cred.url,
      notes: cred.notes
    });
  })
);

// DELETE credential
router.delete(
  '/:id',
  protect,
  authorize('Admin','SistemYonetici'),
  asyncHandler(async (req, res) => {
    const cred = await Credential.findByIdAndDelete(req.params.id);
    if (!cred) {
      res.status(404);
      throw new Error('Credential bulunamadı');
    }
    await AuditLog.create({
      user: req.user._id,
      action: 'delete',
      resourceType: 'Credential',
      resourceId: cred._id,
      ip: req.ip
    });
    res.json({ mesaj: 'Credential silindi' });
  })
);

module.exports = router;
