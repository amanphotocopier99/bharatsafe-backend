const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  payment_order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentOrder',
    required: true,
    unique: true
  },
  serial_id: { type: String, required: true, unique: true },
  scan_code: { type: String, required: true, unique: true, select: false },
  active: { type: Boolean, default: true, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tag', tagSchema);
