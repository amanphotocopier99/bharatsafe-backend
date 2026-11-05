const mongoose = require('mongoose');

const contentSeedStateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seeded_at: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('ContentSeedState', contentSeedStateSchema);
