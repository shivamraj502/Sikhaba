const express = require('express');
const router = express.Router();
const moderationController = require('./moderation.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware); // everything here requires login

// Reports
router.post('/reports', moderationController.createReport);
router.get('/reports', moderationController.getAllReports);                  // admin only
router.patch('/reports/:id', moderationController.updateReportStatus);       // admin only

// Room-level bans (host action)
router.post('/rooms/:roomId/ban/:userId', moderationController.banFromRoom);
router.delete('/rooms/:roomId/ban/:userId', moderationController.unbanFromRoom);

// Platform-level bans (admin only)
router.post('/users/:userId/ban', moderationController.banUserPlatform);
router.delete('/users/:userId/ban', moderationController.unbanUserPlatform);

module.exports = router;