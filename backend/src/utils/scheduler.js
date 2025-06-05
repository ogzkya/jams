const cron = require('node-cron');
const mongoose = require('mongoose');
const Device = require('../models/Device');
const Server = require('../models/Server');
const AuditLog = require('../models/AuditLog');
const { sendMail } = require('./mailer');

// 1) Günlük garanti bitişi kontrolü (00:00)
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(now.getDate() + 7);
    const devices = await Device.find({
      warrantyUntil: { $lte: soon, $gte: now }
    }).populate('assignedTo','email name');
    for (const d of devices) {
      if (d.assignedTo?.email) {
        await sendMail({
          to: d.assignedTo.email,
          subject: `Garanti Yaklaşıyor: ${d.type}`,
          text: `Cihazınız (ID: ${d._id}) garanti bitiş tarihi: ${d.warrantyUntil.toDateString()}`
        });
      }
      await AuditLog.create({
        user: null,
        action: 'notification',
        resourceType: 'Device',
        resourceId: d._id,
        details: { type: 'warrantyExpiry' }
      });
    }
  } catch (err) {
    console.error('Warranty check error:', err);
  }
});

// 2) Saatlik düşük stok uyarısı
cron.schedule('0 * * * *', async () => {
  try {
    const count = await Device.countDocuments({ status: 'stokta' });
    const threshold = 10;
    if (count < threshold) {
      const User = mongoose.model('User');
      const admins = await User.find({ role: 'Admin' });
      for (const a of admins) {
        await sendMail({
          to: a.email,
          subject: 'Düşük Stok Uyarısı',
          text: `Mevcut stok adedi: ${count}`
        });
      }
      await AuditLog.create({
        action: 'notification',
        resourceType: 'Device',
        details: { type: 'lowStock', count }
      });
    }
  } catch (err) {
    console.error('Low stock check error:', err);
  }
});

// 3) 5 DK’da bir sunucu down bildirimi
cron.schedule('*/5 * * * *', async () => {
  try {
    const servers = await Server.find({ status: 'down' });
    const User = mongoose.model('User');
    const admins = await User.find({ role: 'Admin' });
    for (const srv of servers) {
      for (const a of admins) {
        await sendMail({
          to: a.email,
          subject: `Sunucu Hatası: ${srv.name}`,
          text: `Sunucu ${srv.name} (${srv.ip}) erişilemiyor.`
        });
      }
      await AuditLog.create({
        action: 'notification',
        resourceType: 'Server',
        resourceId: srv._id,
        details: { type: 'serverDown' }
      });
    }
  } catch (err) {
    console.error('Server down notification error:', err);
  }
});
