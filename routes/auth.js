const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const adminUser = process.env.ADMIN_USERNAME || 'admin';
const adminPassHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

router.post('/login', (req, res) => {
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
