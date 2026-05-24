const jwt = require('jsonwebtoken');
const { getJwtSecret, getRequestAccessToken } = require('../utils/security');
const { findUserById } = require('../src/repositories/userRepository');

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
    if (!decoded.userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await findUserById(String(decoded.userId));
    if (!user || user.deletedAt) {
      return res.status(401).json({ message: 'Invalid or restricted session' });
    }
    if (typeof decoded.tokenVersion === 'number' && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Session has expired' });
    }

    req.user = {
      ...decoded,
      userId: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: String(user.role || '').toUpperCase() === 'ADMIN',
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = auth;
