const jwt = require('jsonwebtoken');
const { getJwtSecret, getRequestAccessToken } = require('../utils/security');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = getRequestAccessToken(req);

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret('access'));
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    const user = await User.findById(decoded.userId).select('isBanned deletedAt tokenVersion');
    if (!user || user.deletedAt || user.isBanned) {
      return res.status(401).json({ message: 'Invalid or restricted session' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = auth;
