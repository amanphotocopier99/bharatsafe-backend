const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const adminUser = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminPassHash = adminPassword ? bcrypt.hashSync(adminPassword, 10) : null;

router.post('/login', (req, res) => {
  if (!adminUser || !adminPassHash || !process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'Admin authentication is not configured' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username !== adminUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!bcrypt.compareSync(password, adminPassHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ role: 'admin', user: username }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });
  res.json({ token });
});

module.exports = router;
