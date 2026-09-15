const { pool } = require('../../config/db');

const GUEST_DAILY_LIMIT_MINUTES = 60;

async function hasActiveSubscription(user_id) {
  const [rows] = await pool.query(
    `SELECT * FROM subscriptions 
     WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
     ORDER BY end_date DESC LIMIT 1`,
    [user_id]
  );
  return rows.length > 0;
}

async function getTodayUsage(user_id) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [rows] = await pool.query(
    'SELECT minutes_used FROM guest_usage WHERE user_id = ? AND usage_date = ?',
    [user_id, today]
  );
  return rows.length > 0 ? rows[0].minutes_used : 0;
}

async function canUserTalk(user_id) {
  const subscribed = await hasActiveSubscription(user_id);
  if (subscribed) return { allowed: true, unlimited: true, minutes_used: 0, minutes_remaining: null };

  const minutes_used = await getTodayUsage(user_id);
  const allowed = minutes_used < GUEST_DAILY_LIMIT_MINUTES;

  return {
    allowed,
    unlimited: false,
    minutes_used,
    minutes_remaining: Math.max(0, GUEST_DAILY_LIMIT_MINUTES - minutes_used)
  };
}

// Call this periodically (e.g. every 60s via socket heartbeat) while a guest is actively in a room/AI session
async function addUsageMinutes(user_id, minutesToAdd = 1) {
  const subscribed = await hasActiveSubscription(user_id);
  if (subscribed) return; // no need to track for subscribers

  const today = new Date().toISOString().split('T')[0];

  await pool.query(
    `INSERT INTO guest_usage (user_id, usage_date, minutes_used) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE minutes_used = minutes_used + VALUES(minutes_used)`,
    [user_id, today, minutesToAdd]
  );
}

module.exports = {
  hasActiveSubscription,
  getTodayUsage,
  canUserTalk,
  addUsageMinutes,
  GUEST_DAILY_LIMIT_MINUTES
};