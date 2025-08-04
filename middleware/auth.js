const jwt = require('jsonwebtoken');
const { User, TokenBlacklist } = require('../models'); // Assuming TokenBlacklist is for JWT invalidation

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader); // Debug line

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Expecting "Bearer TOKEN"
    console.log('Token extracted:', token ? token.substring(0, 10) + '...' : 'none'); // Debug line

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    try {
      // 1. Verify token signature and expiration
      console.log('Verifying with secret:', process.env.JWT_SECRET ? 'Secret exists' : 'No secret found'); // Debug line
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded.id); // Debug line

      // 2. Check if the token is blacklisted
      const isBlacklisted = await TokenBlacklist.findOne({ where: { token: token } });
      if (isBlacklisted) {
        return res.status(401).json({ message: 'Token is invalid or expired (blacklisted).' });
      }

      // 3. Find the user from the decoded payload
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] } // Exclude password from the user object
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // 4. Attach the user object to the request
      req.user = user;
      next(); // Proceed to the next middleware/route handler

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired.' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token.' });
      }
      console.error('JWT authentication error:', error);
      return res.status(500).json({ message: 'Failed to authenticate token.' });
    }
  } else {
    return res.status(401).json({ message: 'Authorization header missing or malformed.' });
  }
};

module.exports = authenticateJWT;
