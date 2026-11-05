const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
}, { _id: false });

const storeProductSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  label: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  shortDescription: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  imageAlt: { type: String, default: '' },
  price: { type: Number, required: true, min: 1 },
  description: { type: String, default: '' },
  paragraphs: { type: [String], default: [] },
  features: { type: [String], default: [] },
  closing: { type: String, default: '' },
  faqs: { type: [faqSchema], default: [] }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('StoreProduct', storeProductSchema);
