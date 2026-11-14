const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../../config/db');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Single source of truth for prices (the frontend reads these from /plans)
const PLANS = {
  monthly: {
    label: 'Monthly',
    amount: 149,
    days: 30,
    description: 'Unlimited talk time for 30 days'
  },
  yearly: {
    label: 'Yearly',
    amount: 999,
    days: 365,
    description: 'Unlimited talk time for a year (save 44%)'
  }
};

function getPlans() {
  return Object.entries(PLANS).map(([id, p]) => ({
    id,
    label: p.label,
    amount: p.amount,
    days: p.days,
    description: p.description
  }));
}

async function createOrder({ user_id, plan }) {
  if (!PLANS[plan]) throw new Error('Invalid plan');
  const { amount } = PLANS[plan];

  const order = await razorpay.orders.create({
    amount: amount * 100, // paise
    currency: 'INR',
    receipt: `u${user_id}_${Date.now()}`,
    notes: { user_id: String(user_id), plan }
  });

  await pool.query(
    'INSERT INTO payment_orders (razorpay_order_id, user_id, plan, amount) VALUES (?, ?, ?, ?)',
    [order.id, user_id, plan, amount]
  );

  return {
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    plan,
    key_id: process.env.RAZORPAY_KEY_ID // public key, safe to send to the browser
  };
}

function isValidSignature({ order_id, payment_id, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getMySubscription(user_id) {
  const [rows] = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY end_date DESC LIMIT 1',
    [user_id]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function activateSubscription({ user_id, order_id, payment_id, signature }) {
  if (!isValidSignature({ order_id, payment_id, signature })) {
    throw new Error('Payment verification failed');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock this order row so two parallel verify calls can't both activate
    const [orders] = await conn.query(
      'SELECT * FROM payment_orders WHERE razorpay_order_id = ? AND user_id = ? FOR UPDATE',
      [order_id, user_id]
    );
    if (orders.length === 0) throw new Error('Order not found');
    const order = orders[0];

    // Already activated (user retried): do nothing twice
    if (order.status === 'paid') {
      await conn.commit();
      return getMySubscription(user_id);
    }

    // Plan and price come from OUR stored order, never from the browser
    const { days } = PLANS[order.plan];

    // New period starts today, or the day after the current one ends
    await conn.query(
      `INSERT INTO subscriptions (user_id, plan, amount, status, start_date, end_date)
       SELECT ?, ?, ?, 'active', s.start_date, DATE_ADD(s.start_date, INTERVAL ? DAY)
       FROM (
         SELECT CASE WHEN MAX(end_date) >= CURDATE()
                     THEN DATE_ADD(MAX(end_date), INTERVAL 1 DAY)
                     ELSE CURDATE() END AS start_date
         FROM subscriptions
         WHERE user_id = ? AND status = 'active'
       ) s`,
      [user_id, order.plan, order.amount, days, user_id]
    );

    await conn.query(
      `UPDATE payment_orders
       SET status = 'paid', razorpay_payment_id = ?, paid_at = NOW()
       WHERE id = ?`,
      [payment_id, order.id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getMySubscription(user_id);
}

module.exports = { createOrder, activateSubscription, getMySubscription, getPlans, PLANS };