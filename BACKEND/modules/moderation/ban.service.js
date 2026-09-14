const { pool } = require('../../config/db');

// ---------- ROOM-LEVEL BAN (host action) ----------

async function banFromRoom({ room_id, user_id, banned_by, reason }) {
  const [roomRows] = await pool.query('SELECT host_id FROM rooms WHERE id = ?', [room_id]);
  if (roomRows.length === 0) throw new Error('Room not found');
  if (roomRows[0].host_id !== banned_by) throw new Error('Only the host can ban users from this room');

  await pool.query(
    `INSERT INTO room_bans (room_id, user_id, banned_by, reason) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
    [room_id, user_id, banned_by, reason || null]
  );

  // Kick them out if currently in the room
  await pool.query(
    `UPDATE room_participants SET left_at = NOW() 
     WHERE room_id = ? AND user_id = ? AND left_at IS NULL`,
    [room_id, user_id]
  );

  return { message: 'User banned from this room' };
}

async function isUserBannedFromRoom({ room_id, user_id }) {
  const [rows] = await pool.query(
    'SELECT id FROM room_bans WHERE room_id = ? AND user_id = ?',
    [room_id, user_id]
  );
  return rows.length > 0;
}

async function unbanFromRoom({ room_id, user_id, requested_by }) {
  const [roomRows] = await pool.query('SELECT host_id FROM rooms WHERE id = ?', [room_id]);
  if (roomRows.length === 0) throw new Error('Room not found');
  if (roomRows[0].host_id !== requested_by) throw new Error('Only the host can unban users');

  await pool.query('DELETE FROM room_bans WHERE room_id = ? AND user_id = ?', [room_id, user_id]);
  return { message: 'User unbanned from this room' };
}

// ---------- PLATFORM-LEVEL BAN (admin only) ----------

async function banUserPlatform({ user_id, admin_role }) {
  if (admin_role !== 'admin') throw new Error('Only admins can perform platform-wide bans');

  await pool.query('UPDATE users SET is_banned = TRUE WHERE id = ?', [user_id]);
  return { message: 'User banned from the platform' };
}

async function unbanUserPlatform({ user_id, admin_role }) {
  if (admin_role !== 'admin') throw new Error('Only admins can perform this action');

  await pool.query('UPDATE users SET is_banned = FALSE WHERE id = ?', [user_id]);
  return { message: 'User unbanned' };
}

module.exports = {
  banFromRoom,
  isUserBannedFromRoom,
  unbanFromRoom,
  banUserPlatform,
  unbanUserPlatform
};