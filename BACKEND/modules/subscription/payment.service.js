const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../../config/db');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const PLANS = {
  monthly: { amount: 149, days: 30 },
  yearly: { amount: 999, days: 365 }
};

async function createOrder({ plan }) {
  if (!PLANS[plan]) throw new Error('Invalid plan');

  const { amount } = PLANS[plan];

  const order = await razorpay.orders.create({
    amount: amount * 100, // Razorpay expects paise, not rupees
    currency: 'INR',
    receipt: `receipt_${Date.now()}`
  });

  return { order, plan, amount };
}

function verifySignature({ order_id, payment_id, signature }) {
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  return generated_signature === signature;
}

async function activateSubscription({ user_id, plan, order_id, payment_id, signature }) {
  const valid = verifySignature({ order_id, payment_id, signature });
  if (!valid) throw new Error('Payment verification failed');

  if (!PLANS[plan]) throw new Error('Invalid plan');
  const { amount, days } = PLANS[plan];

  const start_date = new Date();
  const end_date = new Date();
  end_date.setDate(end_date.getDate() + days);

  const [result] = await pool.query(
    `INSERT INTO subscriptions (user_id, plan, amount, status, start_date, end_date) 
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [user_id, plan, amount, start_date.toISOString().split('T')[0], end_date.toISOString().split('T')[0]]
  );

  const [rows] = await pool.query('SELECT * FROM subscriptions WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function getMySubscription(user_id) {
  const [rows] = await pool.query(
    `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY end_date DESC LIMIT 1`,
    [user_id]
  );
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { createOrder, activateSubscription, getMySubscription, PLANS };