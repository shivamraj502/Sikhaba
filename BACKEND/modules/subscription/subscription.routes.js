const express = require('express');
const router = express.Router();
const subscriptionController = require('./subscription.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/create-order', subscriptionController.createOrder);
router.post('/verify', subscriptionController.verifyAndActivate);
router.get('/me', subscriptionController.getMySubscription);
router.get('/usage-status', subscriptionController.getUsageStatus);

module.exports = router;