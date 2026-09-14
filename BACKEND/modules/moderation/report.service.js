const { pool } = require('../../config/db');

async function createReport({ reporter_id, reported_user_id, room_id, reason }) {
  if (reporter_id === reported_user_id) throw new Error('You cannot report yourself');

  const [result] = await pool.query(
    'INSERT INTO reports (reporter_id, reported_user_id, room_id, reason) VALUES (?, ?, ?, ?)',
    [reporter_id, reported_user_id, room_id || null, reason]
  );

  const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function getAllReports({ status } = {}) {
  let query = `
    SELECT r.*, 
      reporter.name AS reporter_name, 
      reported.name AS reported_name
    FROM reports r
    JOIN users reporter ON r.reporter_id = reporter.id
    JOIN users reported ON r.reported_user_id = reported.id
  `;
  const params = [];

  if (status) {
    query += ' WHERE r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.created_at DESC';

  const [rows] = await pool.query(query, params);
  return rows;
}

async function updateReportStatus({ report_id, status }) {
  const validStatuses = ['open', 'reviewed', 'resolved'];
  if (!validStatuses.includes(status)) throw new Error('Invalid status');

  await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, report_id]);
  return { message: `Report marked as ${status}` };
}

module.exports = { createReport, getAllReports, updateReportStatus };