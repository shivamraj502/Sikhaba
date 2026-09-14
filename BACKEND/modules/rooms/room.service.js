const { pool } = require('../../config/db');

async function createRoom({ host_id, title, language }) {
  const [result] = await pool.query(
    'INSERT INTO rooms (host_id, title, language, status) VALUES (?, ?, ?, ?)',
    [host_id, title, language || null, 'live']
  );

  const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [result.insertId]);

  // Host is automatically a participant with role 'host'
  await pool.query(
    'INSERT INTO room_participants (room_id, user_id, role) VALUES (?, ?, ?)',
    [result.insertId, host_id, 'host']
  );

  return rows[0];
}

async function getLiveRooms() {
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS host_name, u.country_code AS host_country
     FROM rooms r
     JOIN users u ON r.host_id = u.id
     WHERE r.status = 'live'
     ORDER BY r.created_at DESC`
  );
  return rows;
}

async function getRoomById(room_id) {
  const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [room_id]);
  if (rows.length === 0) throw new Error('Room not found');
  return rows[0];
}

async function joinRoom({ room_id, user_id }) {
  const room = await getRoomById(room_id);
  if (room.status !== 'live') throw new Error('Room is not live');

  // Check if already an active participant (avoid duplicate rows on rejoin)
  const [existing] = await pool.query(
    'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
    [room_id, user_id]
  );
  if (existing.length > 0) return existing[0];

  const [result] = await pool.query(
    'INSERT INTO room_participants (room_id, user_id, role) VALUES (?, ?, ?)',
    [room_id, user_id, 'listener']
  );

  const [rows] = await pool.query('SELECT * FROM room_participants WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function leaveRoom({ room_id, user_id }) {
  await pool.query(
    `UPDATE room_participants SET left_at = NOW() 
     WHERE room_id = ? AND user_id = ? AND left_at IS NULL`,
    [room_id, user_id]
  );
  return { message: 'Left room' };
}

async function endRoom({ room_id, host_id }) {
  const room = await getRoomById(room_id);
  if (room.host_id !== host_id) throw new Error('Only the host can end this room');

  await pool.query(
    `UPDATE rooms SET status = 'ended', ended_at = NOW() WHERE id = ?`,
    [room_id]
  );

  await pool.query(
    `UPDATE room_participants SET left_at = NOW() WHERE room_id = ? AND left_at IS NULL`,
    [room_id]
  );

  return { message: 'Room ended' };
}

module.exports = {
  createRoom,
  getLiveRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  endRoom
};