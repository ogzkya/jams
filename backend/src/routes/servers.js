const express = require('express');
const asyncHandler = require('express-async-handler');
const ping = require('ping');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const AuditLog = require('../models/AuditLog');
const Server = require('../models/Server');
const { runScript } = require('../utils/commandRunner');

const router = express.Router();

// CREATE server
router.post(
  '/',
  protect,
  authorize('Admin','SistemYonetici'),
  asyncHandler(async (req, res) => {
    const srv = await Server.create(req.body);
    await AuditLog.create({
      user: req.user._id,
      action: 'create',
      resourceType: 'Server',
      resourceId: srv._id,
      ip: req.ip
    });
    res.status(201).json(srv);
  })
);

// LIST servers
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const list = await Server.find();
    res.json(list);
  })
);

// PING server
router.post(
  '/:id/ping',
  protect,
  authorize('Admin','TeknikDestek'),
  asyncHandler(async (req, res) => {
    const srv = await Server.findById(req.params.id);
    if (!srv) {
      res.status(404);
      throw new Error('Sunucu bulunamadı');
    }
    const resPing = await ping.promise.probe(srv.ip, { timeout: 10 });
    srv.status = resPing.alive ? 'up' : 'down';
    srv.lastPing = Date.now();
    await srv.save();
    await AuditLog.create({
      user: req.user._id,
      action: 'ping',
      resourceType: 'Server',
      resourceId: srv._id,
      ip: req.ip,
      details: { alive: resPing.alive }
    });
    res.json({ ip: srv.ip, alive: resPing.alive });
  })
);

// RUN predefined script
router.post(
  '/:id/script',
  protect,
  authorize('Admin','SistemYonetici'),
  asyncHandler(async (req, res) => {
    const { key } = req.body; // örn: restartApp
    const srv = await Server.findById(req.params.id);
    if (!srv) {
      res.status(404);
      throw new Error('Sunucu bulunamadı');
    }
    const output = await runScript(key);
    await AuditLog.create({
      user: req.user._id,
      action: 'script',
      resourceType: 'Server',
      resourceId: srv._id,
      ip: req.ip,
      details: { script: key, output }
    });
    res.json({ message: 'Script çalıştırıldı', output });
  })
);

module.exports = router;
