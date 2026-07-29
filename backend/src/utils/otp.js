const crypto = require('crypto');
const { getJwtSecret } = require('./security');

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashOtp({ userId, otp, purpose }) {
  return crypto
    .createHmac('sha256', getJwtSecret('access'))
    .update(`${purpose}:${userId}:${String(otp || '').trim()}`)
    .digest('hex');
}

module.exports = {
  generateOtp,
  hashOtp,
};
