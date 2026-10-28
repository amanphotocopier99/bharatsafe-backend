const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  cashfree_order_id: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  tag_type: { type: String, enum: ['bike', 'car', 'luggage'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR', required: true },
  status: { type: String, default: 'CREATING', required: true },
  payment_session_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
