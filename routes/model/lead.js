const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  blood_group: { type: String, required: true },
  tag_type: { type: String, required: true },
  emergency_contact: { type: String, default: null },
  note: { type: String, default: null },
  status: { type: String, default: 'new' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);