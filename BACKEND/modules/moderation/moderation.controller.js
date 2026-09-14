const reportService = require('./report.service');
const banService = require('./ban.service');

async function createReport(req, res) {
  try {
    const { reported_user_id, room_id, reason } = req.body;
    const report = await reportService.createReport({
      reporter_id: req.user.id,
      reported_user_id,
      room_id,
      reason
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getAllReports(req, res) {
  try {
    if (req.user.role !== 'admin') throw new Error('Admin access required');
    const reports = await reportService.getAllReports({ status: req.query.status });
    res.json(reports);
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
}

async function updateReportStatus(req, res) {
  try {
    if (req.user.role !== 'admin') throw new Error('Admin access required');
    const result = await reportService.updateReportStatus({
      report_id: req.params.id,
      status: req.body.status
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function banFromRoom(req, res) {
  try {
    const result = await banService.banFromRoom({
      room_id: req.params.roomId,
      user_id: req.params.userId,
      banned_by: req.user.id,
      reason: req.body.reason
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function unbanFromRoom(req, res) {
  try {
    const result = await banService.unbanFromRoom({
      room_id: req.params.roomId,
      user_id: req.params.userId,
      requested_by: req.user.id
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function banUserPlatform(req, res) {
  try {
    const result = await banService.banUserPlatform({
      user_id: req.params.userId,
      admin_role: req.user.role
    });
    res.json(result);
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
}

async function unbanUserPlatform(req, res) {
  try {
    const result = await banService.unbanUserPlatform({
      user_id: req.params.userId,
      admin_role: req.user.role
    });
    res.json(result);
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
}

module.exports = {
  createReport,
  getAllReports,
  updateReportStatus,
  banFromRoom,
  unbanFromRoom,
  banUserPlatform,
  unbanUserPlatform
};