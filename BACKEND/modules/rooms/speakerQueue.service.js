const { pool } = require('../../config/db');

async function requestToSpeak({ room_id, user_id }) {
  // Prevent duplicate pending requests
  const [existing] = await pool.query(
    `SELECT * FROM speaker_requests WHERE room_id = ? AND user_id = ? AND status = 'pending'`,
    [room_id, user_id]
  );
  if (existing.length > 0) return existing[0];

  const [result] = await pool.query(
    'INSERT INTO speaker_requests (room_id, user_id, status) VALUES (?, ?, ?)',
    [room_id, user_id, 'pending']
  );

  const [rows] = await pool.query('SELECT * FROM speaker_requests WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function getPendingRequests(room_id) {
  const [rows] = await pool.query(
    `SELECT sr.*, u.name, u.country_code 
     FROM speaker_requests sr
     JOIN users u ON sr.user_id = u.id
     WHERE sr.room_id = ? AND sr.status = 'pending'
     ORDER BY sr.requested_at ASC`,
    [room_id]
  );
  return rows;
}

async function respondToRequest({ request_id, host_id, approve }) {
  const [rows] = await pool.query(
    `SELECT sr.*, r.host_id FROM speaker_requests sr
     JOIN rooms r ON sr.room_id = r.id
     WHERE sr.id = ?`,
    [request_id]
  );
  if (rows.length === 0) throw new Error('Request not found');

  const request = rows[0];
  if (request.host_id !== host_id) throw new Error('Only the host can approve/reject requests');

  const newStatus = approve ? 'approved' : 'rejected';
  await pool.query(
    'UPDATE speaker_requests SET status = ?, responded_at = NOW() WHERE id = ?',
    [newStatus, request_id]
  );

  if (approve) {
    // Promote to speaker in room_participants
    await pool.query(
      `UPDATE room_participants SET role = 'speaker' 
       WHERE room_id = ? AND user_id = ? AND left_at IS NULL`,
      [request.room_id, request.user_id]
    );
  }

  return { message: `Request ${newStatus}` };
}

module.exports = {
  requestToSpeak,
  getPendingRequests,
  respondToRequest
};