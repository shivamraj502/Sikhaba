function normalizePhone(raw) {
  const cleaned = String(raw || '').replace(/[\s\-()]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    throw new Error('Enter a valid phone number with country code');
  }
  return cleaned;
}

module.exports = { normalizePhone };