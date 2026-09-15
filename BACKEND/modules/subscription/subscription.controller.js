const paymentService = require('./payment.service');
const usageTimerService = require('./usageTimer.service');

async function createOrder(req, res) {
  try {
    const { plan } = req.body;
    const result = await paymentService.createOrder({ plan });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function verifyAndActivate(req, res) {
  try {
    const { plan, order_id, payment_id, signature } = req.body;
    const subscription = await paymentService.activateSubscription({
      user_id: req.user.id,
      plan,
      order_id,
      payment_id,
      signature
    });
    res.json(subscription);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getMySubscription(req, res) {
  try {
    const subscription = await paymentService.getMySubscription(req.user.id);
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getUsageStatus(req, res) {
  try {
    const status = await usageTimerService.canUserTalk(req.user.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { createOrder, verifyAndActivate, getMySubscription, getUsageStatus };