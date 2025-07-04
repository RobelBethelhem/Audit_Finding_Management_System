const jwt = require('jsonwebtoken');
const { User, TokenBlacklist } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

class TokenService {
  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: user.type,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }
      return decoded;
    } catch (error) {
      throw error;
    }
  }

  static async revokeToken(token, userId) {
    try {
      const decoded = jwt.decode(token);
      await TokenBlacklist.create({
        token,
        user_id: userId,
        expires_at: new Date(decoded.exp * 1000) // Convert to milliseconds
      });
    } catch (error) {
      throw error;
    }
  }

  static async cleanUpExpiredTokens() {
    try {
      return await TokenBlacklist.cleanupExpiredTokens();
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
}

// Set up token cleanup job (runs every hour)
setInterval(() => {
  TokenService.cleanUpExpiredTokens();
}, 60 * 60 * 1000);

module.exports = TokenService;