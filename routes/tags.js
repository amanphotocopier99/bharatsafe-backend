const express = require('express');
const Tag = require('../models/Tag');

const router = express.Router();

router.get('/:scanCode', async (req, res) => {
  const { scanCode } = req.params;
  if (!/^[a-f0-9]{64}$/.test(scanCode)) {
    return res.status(404).json({ error: 'BharatSafe tag not found or inactive' });
  }

  try {
    const tag = await Tag.findOne({ scan_code: scanCode, active: true })
      .select('+scan_code')
      .populate({
        path: 'payment_order',
        select: 'full_name phone emergency_contact blood_group tag_type status'
      });

    if (!tag || !tag.payment_order || tag.payment_order.status !== 'PAID') {
      return res.status(404).json({ error: 'BharatSafe tag not found or inactive' });
    }

    return res.json({
      serialId: tag.serial_id,
      name: tag.payment_order.full_name,
      phone: tag.payment_order.phone,
      emergencyContact: tag.payment_order.emergency_contact,
      bloodGroup: tag.payment_order.blood_group,
      tagType: tag.payment_order.tag_type
    });
  } catch (error) {
    console.error('Scanned tag lookup failed:', error.message);
    return res.status(500).json({ error: 'Could not load this emergency profile' });
  }
});

module.exports = router;
