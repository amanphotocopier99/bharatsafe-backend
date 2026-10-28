require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Add it in Render Environment variables.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static files from public/ (logo.png lives here)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/payments', require('./routes/payments'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// SPA fallback — do NOT swallow file or API requests
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api') || path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`BharatSafe backend running on http://localhost:${PORT}`);
});
