const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

router.post('/signup', authController.signup);           // email + password
router.post('/login', authController.login);             // email + password
router.post('/otp/send', authController.sendOtp);         // phone step 1
router.post('/otp/verify', authController.verifyOtp);     // phone step 2 (also creates user if new)

module.exports = router;