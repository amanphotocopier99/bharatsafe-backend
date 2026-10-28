const crypto = require('crypto');
const express = require('express');
const QRCode = require('qrcode');
const requireAuth = require('../middleware/auth');
const PaymentOrder = require('../models/PaymentOrder');
const Tag = require('../models/Tag');
const TagCounter = require('../models/TagCounter');

const router = express.Router();
const API_VERSION = '2025-01-01';
const PRODUCTS = {
  bike: 'Bike',
  car: 'Car',
  luggage: 'Luggage'
};
const PRICE_INR = 149;
const TAG_COUNTER_ID = 'customer-tag';

class CashfreeRequestError extends Error {
  constructor(status) {
    super('Cashfree request failed');
    this.status = status;
  }
}

function getCashfreeConfig() {
  const mode = process.env.CASHFREE_ENV || 'sandbox';
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const baseUrl = process.env.APP_BASE_URL;

  if (!['sandbox', 'production'].includes(mode) || !clientId || !clientSecret || !baseUrl) {
    return null;
  }

  let appUrl;
  try {
    appUrl = new URL(baseUrl);
  } catch {
    return null;
  }

  if (
    !['http:', 'https:'].includes(appUrl.protocol) ||
    appUrl.username ||
    appUrl.password ||
    appUrl.pathname !== '/' ||
    appUrl.search ||
    appUrl.hash ||
    (mode === 'production' && appUrl.protocol !== 'https:')
  ) {
    return null;
  }

  return {
    mode,
    clientId,
    clientSecret,
    appUrl,
    apiUrl: mode === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg'
  };
}

async function cashfreeRequest(config, pathname, options = {}) {
  const response = await fetch(`${config.apiUrl}${pathname}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': config.clientId,
      'x-client-secret': config.clientSecret,
      ...options.headers
    },
    signal: AbortSignal.timeout(15000)
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new CashfreeRequestError(response.status);
  }

  if (!response.ok) {
    throw new CashfreeRequestError(response.status);
  }

  return result;
}

async function issueTag(order) {
  const existing = await Tag.findOne({ payment_order: order._id }).select('+scan_code');
  if (existing) return existing;

  let counter;
  try {
    counter = await TagCounter.findByIdAndUpdate(
      TAG_COUNTER_ID,
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    counter = await TagCounter.findByIdAndUpdate(
      TAG_COUNTER_ID,
      { $inc: { sequence: 1 } },
      { new: true }
    );
    if (!counter) throw error;
  }
  const serialId = `BS-${String(counter.sequence).padStart(6, '0')}`;

  try {
    return await Tag.create({
      payment_order: order._id,
      serial_id: serialId,
      scan_code: crypto.randomBytes(32).toString('hex')
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const tag = await Tag.findOne({ payment_order: order._id }).select('+scan_code');
    if (!tag) throw error;
    return tag;
  }
}

function getScanUrl(config, scanCode) {
  return new URL(`/s/${scanCode}`, config.appUrl).toString();
}

async function getTagQr(config, tag) {
  const scanUrl = getScanUrl(config, tag.scan_code);
  const qrCode = await QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 256
  });
  return { scanUrl, qrCode };
}

function getCustomerDetails(body) {
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const contactNumber = typeof body.contactNumber === 'string' ? body.contactNumber.trim() : '';
  const emergencyContactNumber = typeof body.emergencyContact === 'string'
    ? body.emergencyContact.trim()
    : '';
  const bloodGroup = body.bloodGroup;
  const tagType = body.tagType;
  const normalizePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    return /^[6-9]\d{9}$/.test(phone) ? phone : null;
  };
  const phone = normalizePhone(contactNumber);
  const emergencyContact = emergencyContactNumber
    ? normalizePhone(emergencyContactNumber)
    : null;

  if (
    !fullName ||
    fullName.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !phone ||
    !address ||
    address.length > 500 ||
    !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup) ||
    (emergencyContactNumber && !emergencyContact) ||
    !Object.prototype.hasOwnProperty.call(PRODUCTS, tagType)
  ) {
    return null;
  }

  return { fullName, email, phone, address, bloodGroup, emergencyContact, tagType };
}

router.post('/orders', async (req, res) => {
  const config = getCashfreeConfig();
  if (!config) {
    return res.status(503).json({ error: 'Payment gateway is not configured' });
  }

  const customer = getCustomerDetails(req.body || {});
  if (!customer) {
    return res.status(400).json({ error: 'Enter valid contact and delivery details' });
  }

  const orderId = `bs_${crypto.randomUUID().replace(/-/g, '')}`;
  let order;
  try {
    order = await PaymentOrder.create({
      cashfree_order_id: orderId,
      full_name: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      blood_group: customer.bloodGroup,
      emergency_contact: customer.emergencyContact,
      tag_type: customer.tagType,
      amount: PRICE_INR,
      currency: 'INR',
      status: 'CREATING'
    });
  } catch (error) {
    console.error('Payment order save failed:', error.message);
    return res.status(500).json({ error: 'Could not create your order. Please try again.' });
  }

  const returnUrl = new URL('/get-qr.html', config.appUrl);
  returnUrl.searchParams.set('order_id', orderId);

  try {
    const gatewayOrder = await cashfreeRequest(config, '/orders', {
      method: 'POST',
      headers: { 'x-idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: PRICE_INR,
        order_currency: 'INR',
        customer_details: {
          customer_id: orderId,
          customer_name: customer.fullName,
          customer_email: customer.email,
          customer_phone: customer.phone
        },
        order_meta: { return_url: returnUrl.toString() },
        order_note: `BharatSafe ${PRODUCTS[customer.tagType]} tag`
      })
    });

    if (gatewayOrder.order_id !== orderId || !gatewayOrder.payment_session_id) {
      throw new CashfreeRequestError(502);
    }

    order.payment_session_id = gatewayOrder.payment_session_id;
    order.status = gatewayOrder.order_status || 'ACTIVE';
    await order.save();

    return res.status(201).json({
      orderId,
      paymentSessionId: order.payment_session_id,
      checkoutMode: config.mode
    });
  } catch (error) {
    console.error(
      'Cashfree order creation failed:',
      error instanceof CashfreeRequestError ? `HTTP ${error.status}` : error.message
    );
    try {
      order.status = 'CREATE_FAILED';
      await order.save();
    } catch (saveError) {
      console.error('Payment order status update failed:', saveError.message);
    }
    return res.status(502).json({ error: 'Could not start payment. Please try again.' });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  const config = getCashfreeConfig();
  if (!config) {
    return res.status(503).json({ error: 'Payment gateway is not configured' });
  }

  const orderId = req.params.orderId;
  if (!/^bs_[a-f0-9]{32}$/.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  let order;
  try {
    order = await PaymentOrder.findOne({ cashfree_order_id: orderId });
  } catch (error) {
    console.error('Payment order lookup failed:', error.message);
    return res.status(500).json({ error: 'Could not check payment status' });
  }
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  try {
    const gatewayOrder = await cashfreeRequest(
      config,
      `/orders/${encodeURIComponent(orderId)}`
    );

    if (gatewayOrder.order_id !== orderId) {
      throw new CashfreeRequestError(502);
    }
    if (
      gatewayOrder.order_status === 'PAID' &&
      (Number(gatewayOrder.order_amount) !== order.amount || gatewayOrder.order_currency !== order.currency)
    ) {
      console.error('Cashfree order amount or currency mismatch:', orderId);
      return res.status(502).json({ error: 'Could not verify payment' });
    }

    order.status = gatewayOrder.order_status || order.status;
    await order.save();

    const result = {
      orderId,
      status: order.status,
      tagType: order.tag_type,
      amount: order.amount,
      paymentSessionId: order.status === 'ACTIVE' ? order.payment_session_id : undefined,
      checkoutMode: config.mode
    };

    if (order.status === 'PAID') {
      await issueTag(order);
    }

    return res.json(result);
  } catch (error) {
    console.error(
      'Cashfree payment verification failed:',
      error instanceof CashfreeRequestError ? `HTTP ${error.status}` : error.message
    );
    return res.status(502).json({ error: 'Could not check payment status. Please try again.' });
  }
});

router.get('/tags', requireAuth, async (req, res) => {
  const config = getCashfreeConfig();
  if (!config) {
    return res.status(503).json({ error: 'Payment gateway is not configured' });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedSkip = Number.parseInt(req.query.skip, 10);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 50)
    : 25;
  const skip = Number.isInteger(requestedSkip) && requestedSkip >= 0
    ? Math.min(requestedSkip, 100000)
    : 0;

  try {
    const orders = await PaymentOrder.find({ status: 'PAID' })
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(limit + 1);
    const hasMore = orders.length > limit;
    const pageOrders = orders.slice(0, limit);
    const tags = await Promise.all(pageOrders.map(async (order) => {
      const tag = await issueTag(order);
      const qr = await getTagQr(config, tag);
      return {
        serialId: tag.serial_id,
        scanUrl: qr.scanUrl,
        qrCode: qr.qrCode,
        active: tag.active,
        name: order.full_name,
        phone: order.phone,
        address: order.address,
        tagType: order.tag_type,
        bloodGroup: order.blood_group,
        createdAt: tag.created_at
      };
    }));

    return res.json({
      tags,
      hasMore,
      nextSkip: skip + pageOrders.length
    });
  } catch (error) {
    console.error('Issued tag list failed:', error.message);
    return res.status(500).json({ error: 'Could not load issued tags' });
  }
});

router.patch('/tags/:serialId', requireAuth, async (req, res) => {
  const { serialId } = req.params;
  if (!/^BS-\d{6,}$/.test(serialId) || typeof req.body?.active !== 'boolean') {
    return res.status(400).json({ error: 'Invalid tag update' });
  }

  try {
    const tag = await Tag.findOneAndUpdate(
      { serial_id: serialId },
      { active: req.body.active },
      { new: true }
    );
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    return res.json({ serialId: tag.serial_id, active: tag.active });
  } catch (error) {
    console.error('Tag update failed:', error.message);
    return res.status(500).json({ error: 'Could not update tag' });
  }
});

module.exports = router;
