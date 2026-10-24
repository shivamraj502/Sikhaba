const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middlewares/authMiddleware');   
const { otpLimiter } = require('../../middlewares/rateLimiter');

router.post('/signup', authController.signup);           // email + password
router.post('/login', authController.login);             // email + password
// router.post('/otp/send', authController.sendOtp);         // phone step 1
// router.post('/otp/verify', authController.verifyOtp);     // phone step 2 (also creates user if new)

router.get('/me', authMiddleware, authController.getProfile);
router.put('/me', authMiddleware, authController.updateProfile);

router.post('/otp/send', otpLimiter, authController.sendOtp);
router.post('/otp/verify', otpLimiter, authController.verifyOtp);

router.post('/phone/send-otp', authMiddleware, otpLimiter, authController.sendPhoneOtp);
router.post('/phone/verify', authMiddleware, otpLimiter, authController.verifyPhone);

module.exports = router;