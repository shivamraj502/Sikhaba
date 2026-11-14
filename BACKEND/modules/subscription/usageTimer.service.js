const { pool } = require('../../config/db');

// Override with GUEST_DAILY_LIMIT_SECONDS=120 to test quickly
const DAILY_LIMIT_SECONDS = Number(process.env.GUEST_DAILY_LIMIT_SECONDS) || 25 * 60;
const USAGE_TZ = process.env.USAGE_TZ || 'Asia/Kolkata';

// "Today" in the app's timezone, as YYYY-MM-DD
function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: USAGE_TZ });
}

async function hasActiveSubscription(user_id) {
  const [rows] = await pool.query(
    `SELECT id FROM subscriptions
     WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE() LIMIT 1`,
    [user_id]
  );
  return rows.length > 0;
}

// No daily limit for: subscribers, and users with role 'host' or 'admin'
async function isUnlimited(user_id) {
  const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [user_id]);
  if (rows.length === 0) return false;
  if (['host', 'admin'].includes(rows[0].role)) return true;
  return hasActiveSubscription(user_id);
}

async function getUsedSeconds(user_id) {
  const [rows] = await pool.query(
    'SELECT seconds_used FROM guest_usage WHERE user_id = ? AND usage_date = ?',
    [user_id, todayStr()]
  );
  return rows.length > 0 ? rows[0].seconds_used : 0;
}

async function addUsageSeconds(user_id, seconds) {
  if (!seconds || seconds <= 0) return;
  await pool.query(
    `INSERT INTO guest_usage (user_id, usage_date, seconds_used) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE seconds_used = seconds_used + VALUES(seconds_used)`,
    [user_id, todayStr(), Math.round(seconds)]
  );
}

async function getUsageStatus(user_id) {
  if (await isUnlimited(user_id)) {
    return {
      allowed: true,
      unlimited: true,
      seconds_used: 0,
      seconds_remaining: null,
      minutes_used: 0,
      minutes_remaining: null
    };
  }

  const used = await getUsedSeconds(user_id);
  const remaining = Math.max(0, DAILY_LIMIT_SECONDS - used);

  return {
    allowed: remaining > 0,
    unlimited: false,
    seconds_used: used,
    seconds_remaining: remaining,
    minutes_used: Math.floor(used / 60),
    minutes_remaining: Math.ceil(remaining / 60)
  };
}

async function assertCanJoin(user_id) {
  const status = await getUsageStatus(user_id);
  if (!status.allowed) {
    const err = new Error('Your free time for today is used up. Subscribe to keep talking.');
    err.code = 'LIMIT_REACHED';
    throw err;
  }
  return status;
}

module.exports = {
  hasActiveSubscription,
  isUnlimited,
  getUsedSeconds,
  addUsageSeconds,
  getUsageStatus,
  canUserTalk: getUsageStatus, 
  assertCanJoin,
  DAILY_LIMIT_SECONDS
};