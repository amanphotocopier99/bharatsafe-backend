const mongoose = require('mongoose');

const tagCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0, required: true }
});

module.exports = mongoose.model('TagCounter', tagCounterSchema);
