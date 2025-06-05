const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  ip: String,
  mac: String,
  serial: String,
  purchasedAt: Date,
  warrantyUntil: Date,
  status: { type: String, enum: ['aktif','arızalı','stokta'], default: 'stokta' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  customFields: mongoose.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', deviceSchema);
