const express = require('express');
const requireAuth = require('../middleware/auth');
const Lead = require('../models/Lead');
const router = express.Router();

// POST /api/leads — save a new form submission
router.post('/', async (req, res) => {
  try {
    const { fullName, phone, email, address, bloodGroup, tagType, emergencyContact, note } = req.body || {};

    if (!fullName || !phone || !email || !address || !bloodGroup || !tagType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lead = await Lead.create({
      full_name: fullName,
      phone,
      email,
      address,
      blood_group: bloodGroup,
      tag_type: tagType,
      emergency_contact: emergencyContact || null,
      note: note || null
    });

    res.status(201).json({ id: lead._id, ok: true });
  } catch (err) {
    console.error('Save lead error:', err.message);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// GET /api/leads — admin panel fetch
router.get('/', requireAuth, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ created_at: -1, _id: -1 });
    res.json(leads);
  } catch (err) {
    console.error('Fetch leads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// PATCH /api/leads/:id — update status, note, emergency contact
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { status, note, emergencyContact } = req.body || {};

    const update = {};
    if (status !== undefined) update.status = status;
    if (note !== undefined) update.note = note;
    if (emergencyContact !== undefined) update.emergency_contact = emergencyContact;

    const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!lead) return res.status(404).json({ error: 'Not found' });

    res.json(lead);
  } catch (err) {
    console.error('Update lead error:', err.message);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete lead error:', err.message);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;