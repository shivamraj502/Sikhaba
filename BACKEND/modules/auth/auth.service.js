const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, phone: user.phone },
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

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function sendOtp(phone) {
  const otp_code = generateOtp();
  const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  await pool.query(
    'INSERT INTO otp_verifications (phone, otp_code, expires_at) VALUES (?, ?, ?)',
    [phone, otp_code, expires_at]
  );

  // TODO: integrate real SMS provider (MSG91 / Twilio) here.
  // For now, we log it so you can test locally.
  console.log(`📱 OTP for ${phone}: ${otp_code}`);

  return { message: 'OTP sent' };
}

async function verifyOtpAndLogin({ phone, otp_code, name, country_code }) {
  const [rows] = await pool.query(
    `SELECT * FROM otp_verifications 
     WHERE phone = ? AND otp_code = ? AND verified = FALSE AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [phone, otp_code]
  );

  if (rows.length === 0) throw new Error('Invalid or expired OTP');

  await pool.query('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [rows[0].id]);

  // Find or create user
  let [userRows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
  let user;

  if (userRows.length === 0) {
    const [result] = await pool.query(
      'INSERT INTO users (name, phone, country_code) VALUES (?, ?, ?)',
      [name || 'User', phone, country_code || null]
    );
    const [newUserRows] = await pool.query('SELECT id, name, phone, country_code, role FROM users WHERE id = ?', [result.insertId]);
    user = newUserRows[0];
  } else {
    user = userRows[0];
    delete user.password_hash;
  }

  const token = generateToken(user);
  return { user, token };
}

module.exports = {
  signupWithEmail,
  loginWithEmail,
  sendOtp,
  verifyOtpAndLogin
};