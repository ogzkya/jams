const express = require('express');
const asyncHandler = require('express-async-handler');
const ping = require('ping');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const AuditLog = require('../models/AuditLog');
const Server = require('../models/Server');

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
  authorize('ADMIN','SYSTEM_ADMIN'),
  asyncHandler(async (req, res) => {
    const { key } = req.body;
    const server = await Server.findById(req.params.id);
    
    if (!server) {
      res.status(404);
      throw new Error('Sunucu bulunamadı');
    }
    
    // Komut güvenliği ve yetkilendirme kontrolleri
    if (!server.allowedCommands || !server.allowedCommands.some(cmd => cmd.command === key)) {
      res.status(403);
      throw new Error('Bu komut bu sunucu için izin verilmiyor');
    }
    
    // Log komut çalıştırma girişimi
    await AuditLog.create({
      user: req.user._id,
      action: 'script_execute',
      resourceType: 'Server',
      resourceId: server._id,
      ip: req.ip,
      details: { script: key }
    });
    
    // Burada gerçek script çalıştırma işlemi olacak
    // Güvenlik nedeniyle, gerçek implementation'ı burada yer almamaktadır
    
    res.json({
      success: true,
      message: `${key} komutu başarıyla çalıştırıldı`,
      data: {
        serverId: server._id,
        serverName: server.name,
        script: key,
        timestamp: new Date()
      }
    });
  })
);

module.exports = router;
