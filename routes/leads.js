const express = require('express');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { fullName, phone, email, address, bloodGroup, tagType, emergencyContact, note } = req.body || {};

  if (!fullName || !phone || !email || !address || !bloodGroup || !tagType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const info = db.prepare(`
    INSERT INTO leads (full_name, phone, email, address, blood_group, tag_type, emergency_contact, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(fullName, phone, email, address, bloodGroup, tagType, emergencyContact || null, note || null);

  res.status(201).json({ id: info.lastInsertRowid, ok: true });
});

router.get('/', requireAuth, (req, res) => {
  const rows = req.app.locals.db.prepare(`
    SELECT * FROM leads ORDER BY datetime(created_at) DESC, id DESC
  `).all();
  res.json(rows);
});

router.patch('/:id', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const { status, note, emergencyContact } = req.body || {};
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE leads
    SET status = COALESCE(?, status),
        note = COALESCE(?, note),
        emergency_contact = COALESCE(?, emergency_contact)
    WHERE id = ?
  `).run(status ?? null, note ?? null, emergencyContact ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  const info = req.app.locals.db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;