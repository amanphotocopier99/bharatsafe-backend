console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET, "length:", process.env.JWT_SECRET?.length);
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
app.use(express.json({ limit: '5mb' }));

const cleanPagePaths = new Map([
  ['/index.html', '/'],
  ['/about-us.html', '/about-us'],
  ['/blog.html', '/blog'],
  ['/get-qr.html', '/get-qr'],
  ['/return-policy.html', '/return-policy'],
  ['/shipping-delivery.html', '/shipping-delivery'],
  ['/payment-info.html', '/payment-info'],
  ['/product.html', '/product'],
  ['/admin.html', '/admin']
]);

app.use((req, res, next) => {
  const cleanPath = cleanPagePaths.get(req.path);
  if (cleanPath) {
    return res.redirect(301, `${cleanPath}${req.url.slice(req.path.length)}`);
  }
  next();
});

// Serve static files and resolve extensionless page URLs to their HTML files.
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// API routes
app.use('/api', require('./routes/auth'));
app.use('/api/content', require('./routes/content'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tags', require('./routes/tags'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/s/:scanCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

app.get('/product-:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

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
