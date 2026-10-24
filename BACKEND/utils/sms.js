async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'console') {
    console.log(`📱 [DEV SMS] to ${phone}: ${message}`);
    return;
  }

  throw new Error(`SMS provider "${provider}" is not configured`);
}

module.exports = { sendSms };