const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  username: String,
  password: { type: String, required: true }, // encrypted payload
  url: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Credential', credentialSchema);
