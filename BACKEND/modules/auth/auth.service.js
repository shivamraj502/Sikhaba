const crypto = require('crypto');
const { normalizePhone } = require('../../utils/phone');
const { sendSms } = require('../../utils/sms');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, phone: user.phone },   
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ---------- EMAIL + PASSWORD ----------

async function signupWithEmail({ name, email, password, country_code }) {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new Error('Email already registered');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, country_code) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, country_code || null]
  );

  const [rows] = await pool.query('SELECT id, name, email, country_code, role FROM users WHERE id = ?', [result.insertId]);
  const user = rows[0];
  const token = generateToken(user);
  return { user, token };
}

async function loginWithEmail({ email, password }) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) throw new Error('Invalid email or password');

  const user = rows[0];
  if (!user.password_hash) throw new Error('This account uses phone login, not password');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Invalid email or password');

  const token = generateToken(user);
  delete user.password_hash;
  return { user, token };
}

// ---------- PHONE OTP ----------

async function createAndSendOtp(phone) {
  const [recent] = await pool.query(
    `SELECT id FROM otp_verifications
     WHERE phone = ? AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1`,
    [phone]
  );
  if (recent.length > 0) throw new Error('Please wait a minute before requesting another OTP');

  const otp_code = String(crypto.randomInt(100000, 1000000));
  const [ins] = await pool.query(
    `INSERT INTO otp_verifications (phone, otp_code, expires_at)
     VALUES (?, ?, NOW() + INTERVAL 5 MINUTE)`,
    [phone, otp_code]
  );

  try {
    await sendSms(phone, `Your Sikhaba verification code is ${otp_code}. It expires in 5 minutes.`);
  } catch (err) {
    await pool.query('DELETE FROM otp_verifications WHERE id = ?', [ins.insertId]);
    throw new Error('Could not send OTP. Please try again.');
  }
}

async function consumeOtp(phone, otp_code) {
  const [rows] = await pool.query(
    `SELECT id FROM otp_verifications
     WHERE phone = ? AND otp_code = ? AND verified = FALSE AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [phone, String(otp_code || '')]
  );
  if (rows.length === 0) throw new Error('Invalid or expired OTP');

  // Atomic: a code can only be used once, even with parallel requests
  const [upd] = await pool.query(
    'UPDATE otp_verifications SET verified = TRUE WHERE id = ? AND verified = FALSE',
    [rows[0].id]
  );
  if (upd.affectedRows === 0) throw new Error('Invalid or expired OTP');
}

// Login / signup with phone
async function sendOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await createAndSendOtp(phone);
  return { message: 'OTP sent' };
}

async function verifyOtpAndLogin({ phone: rawPhone, otp_code, name, country_code }) {
  const phone = normalizePhone(rawPhone);
  await consumeOtp(phone, otp_code);

  const [userRows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
  let user;

  if (userRows.length === 0) {
    const [result] = await pool.query(
      'INSERT INTO users (name, phone, country_code) VALUES (?, ?, ?)',
      [(name || '').trim() || 'User', phone, country_code || null]
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, country_code, role FROM users WHERE id = ?',
      [result.insertId]
    );
    user = rows[0];
  } else {
    user = userRows[0];
    delete user.password_hash;
  }

  return { user, token: generateToken(user) };
}

async function getProfile(user_id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, phone, country_code, avatar_url, role, created_at FROM users WHERE id = ?',
    [user_id]
  );
  if (rows.length === 0) throw new Error('User not found');
  return rows[0];
}

async function updateProfile(user_id, { name, country_code, avatar_url }) {
  await pool.query(
    'UPDATE users SET name = COALESCE(?, name), country_code = COALESCE(?, country_code), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
    [name || null, country_code || null, avatar_url || null, user_id]
  );
  return getProfile(user_id);
}

// change phone from Profile (logged-in user)
async function sendPhoneChangeOtp(user_id, rawPhone) {
  const phone = normalizePhone(rawPhone);
  const [taken] = await pool.query('SELECT id FROM users WHERE phone = ? AND id <> ?', [phone, user_id]);
  if (taken.length > 0) throw new Error('This number is already linked to another account');

  await createAndSendOtp(phone);
  return { message: 'OTP sent' };
}

async function verifyPhoneChange(user_id, { phone: rawPhone, otp_code }) {
  const phone = normalizePhone(rawPhone);
  await consumeOtp(phone, otp_code);

  try {
    await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, user_id]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new Error('This number is already linked to another account');
    throw err;
  }
  return getProfile(user_id);
}

module.exports = {
  signupWithEmail,
  loginWithEmail,
  createAndSendOtp,
  consumeOtp,
  sendOtp,
  verifyOtpAndLogin,
  getProfile,
  updateProfile,
  sendPhoneChangeOtp,
  verifyPhoneChange
};