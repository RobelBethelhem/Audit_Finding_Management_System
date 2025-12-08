// const jwt = require('jsonwebtoken');
// const { User, TokenBlacklist } = require('../models'); // Assuming TokenBlacklist is for JWT invalidation

// const authenticateJWT = async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   console.log('Auth header:', authHeader); // Debug line

//   if (authHeader) {
//     const token = authHeader.split(' ')[1]; // Expecting "Bearer TOKEN"
//     console.log('Token extracted:', token ? token.substring(0, 10) + '...' : 'none'); // Debug line

//     if (!token) {
//       return res.status(401).json({ message: 'No token provided.' });
//     }

//     try {
//       // 1. Verify token signature and expiration
//       console.log('Verifying with secret:', process.env.JWT_SECRET ? 'Secret exists' : 'No secret found'); // Debug line
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log('Token decoded successfully:', decoded.id); // Debug line

//       // 2. Check if the token is blacklisted
//       const isBlacklisted = await TokenBlacklist.findOne({ where: { token: token } });
//       if (isBlacklisted) {
//         return res.status(401).json({ message: 'Token is invalid or expired (blacklisted).' });
//       }

//       // 3. Find the user from the decoded payload
//       const user = await User.findByPk(decoded.id, {
//         attributes: { exclude: ['password'] } // Exclude password from the user object
//       });

//       if (!user) {
//         return res.status(404).json({ message: 'User not found.' });
//       }

//       // 4. Attach the user object to the request
//       req.user = user;
//       next(); // Proceed to the next middleware/route handler

//     } catch (error) {
//       if (error.name === 'TokenExpiredError') {
//         return res.status(401).json({ message: 'Token expired.' });
//       }
//       if (error.name === 'JsonWebTokenError') {
//         return res.status(401).json({ message: 'Invalid token.' });
//       }
//       console.error('JWT authentication error:', error);
//       return res.status(500).json({ message: 'Failed to authenticate token.' });
//     }
//   } else {
//     return res.status(401).json({ message: 'Authorization header missing or malformed.' });
//   }
// };

// module.exports = authenticateJWT;



// middleware/auth.js
const TokenService = require('../services/TokenService');
const { User } = require('../models');

// Middleware to check if token is blacklisted
const checkBlacklistedToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, let other middleware handle it
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    // Check if token is blacklisted
    const { TokenBlacklist } = require('../models');
    const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
    
    if (isBlacklisted) {
      return res.status(401).json({ 
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
        message: 'Please login again'
      });
    }

    // Token is not blacklisted, continue
    next();
  } catch (error) {
    console.error('Error in blacklist middleware:', error);
    // Don't block on error, let auth middleware handle it
    next();
  }
};

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Invalid authorization header',
        code: 'INVALID_HEADER'
      });
    }

    // Verify token (this also checks if it's blacklisted)
    const decoded = await TokenService.verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] } 
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Attach user info to request
   // req.user = decoded;
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.message === 'Token has been revoked') {
      return res.status(401).json({ 
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

module.exports = {
  checkBlacklistedToken,
  authenticate,
  authorize
};
