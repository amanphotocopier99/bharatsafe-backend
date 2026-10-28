const crypto = require('crypto');
const express = require('express');
const PaymentOrder = require('../models/PaymentOrder');

const router = express.Router();
const API_VERSION = '2025-01-01';
const PRODUCTS = {
  bike: 'Bike',
  car: 'Car',
  luggage: 'Luggage'
};
const PRICE_INR = 149;

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

function getCustomerDetails(body) {
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const contactNumber = typeof body.contactNumber === 'string' ? body.contactNumber.trim() : '';
  const tagType = body.tagType;
  const digits = contactNumber.replace(/\D/g, '');
  const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

  if (
    !fullName ||
    fullName.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !/^[6-9]\d{9}$/.test(phone) ||
    !address ||
    address.length > 500 ||
    !Object.prototype.hasOwnProperty.call(PRODUCTS, tagType)
  ) {
    return null;
  }

  return { fullName, email, phone, address, tagType };
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

    return res.json({
      orderId,
      status: order.status,
      tagType: order.tag_type,
      amount: order.amount,
      paymentSessionId: order.status === 'ACTIVE' ? order.payment_session_id : undefined,
      checkoutMode: config.mode
    });
  } catch (error) {
    console.error(
      'Cashfree payment verification failed:',
      error instanceof CashfreeRequestError ? `HTTP ${error.status}` : error.message
    );
    return res.status(502).json({ error: 'Could not check payment status. Please try again.' });
  }
});

module.exports = router;
