const jwt = require('jsonwebtoken');
const { getCookie, getJwtSecret } = require('../utils/security');

const auth = (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : null;
    const token = getCookie(req, "accessToken") || getCookie(req, "authToken") || bearerToken;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret('access'));
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = auth;
