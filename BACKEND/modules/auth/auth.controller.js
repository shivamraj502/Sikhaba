const authService = require('./auth.service');

async function signup(req, res) {
  try {
    const { user, token } = await authService.signupWithEmail(req.body);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function login(req, res) {
  try {
    const { user, token } = await authService.loginWithEmail(req.body);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
}

async function sendOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    const result = await authService.sendOtp(phone);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function verifyOtp(req, res) {
  try {
    const { user, token } = await authService.verifyOtpAndLogin(req.body);
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const profile = await authService.updateProfile(req.user.id, req.body);
    res.json(profile);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {  
  signup, 
  login, 
  sendOtp, 
  verifyOtp, 
  getProfile, 
  updateProfile 
};