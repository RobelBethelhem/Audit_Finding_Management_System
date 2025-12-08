// const jwt = require('jsonwebtoken');
// const { User, TokenBlacklist } = require('../models');
// const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

// class TokenService {
//   static generateToken(user) {
//     return jwt.sign(
//       {
//         id: user.id,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//         type: user.type,
//       },
//       JWT_SECRET,
//       { expiresIn: JWT_EXPIRES_IN }
//     );
//   }

//   static async verifyToken(token) {
//     try {
//       const decoded = jwt.verify(token, JWT_SECRET);
//       // Check if token is blacklisted
//       const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
//       if (isBlacklisted) {
//         throw new Error('Token has been revoked');
//       }
//       return decoded;
//     } catch (error) {
//       throw error;
//     }
//   }

//   static async revokeToken(token, userId) {
//     try {
//       const decoded = jwt.decode(token);
//       await TokenBlacklist.create({
//         token,
//         user_id: userId,
//         expires_at: new Date(decoded.exp * 1000) // Convert to milliseconds
//       });
//     } catch (error) {
//       throw error;
//     }
//   }

//   static async cleanUpExpiredTokens() {
//     try {
//       return await TokenBlacklist.cleanupExpiredTokens();
//     } catch (error) {
//       console.error('Error cleaning up expired tokens:', error);
//     }
//   }
// }

// // Set up token cleanup job (runs every hour)
// setInterval(() => {
//   TokenService.cleanUpExpiredTokens();
// }, 60 * 60 * 1000);

// module.exports = TokenService;




const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, TokenBlacklist, ActiveSession } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

class TokenService {
  // Generate token - unchanged
  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        branch: user.branch,
        department: user.department,
        type: user.type,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Create session for user (removes any existing session)
  static async createUserSession(user, token, requestInfo = {}) {
    try {
      console.log('TokenService.createUserSession called for user:', user.id);
      
      // Decode token to get expiration
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token - cannot decode');
      }
      
      const expiresAt = new Date(decoded.exp * 1000);
      console.log('Token expires at:', expiresAt);
  
      // Check if ActiveSession model exists and has createSession method
      if (!ActiveSession) {
        throw new Error('ActiveSession model not found');
      }
      
      if (typeof ActiveSession.createSession !== 'function') {
        throw new Error('ActiveSession.createSession method not found');
      }
  
      // Create new active session (this will remove any existing session)
      const session = await ActiveSession.createSession(user.id, token, expiresAt, requestInfo);
      
      console.log(`New session created for user ${user.username}`);
      return session;
    } catch (error) {
      console.error('Error in TokenService.createUserSession:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  // Verify token with session and blacklist check
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Check if this is the active session for the user
      const isActiveSession = await ActiveSession.isActiveSession(token, decoded.id);
      if (!isActiveSession) {
        throw new Error('Session is not active or has been replaced');
      }

      // Update last activity
      await ActiveSession.updateActivity(token);
      
      return decoded;
    } catch (error) {
      throw error;
    }
  }

  // Check if user has active session
  static async hasActiveSession(userId) {
    const session = await ActiveSession.getUserSession(userId);
    return !!session;
  }

  // Get session info
  static async getSessionInfo(userId) {
    const session = await ActiveSession.getUserSession(userId);
    if (!session) return null;

    return {
      userId: session.user_id,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      deviceInfo: session.device_info,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      createdAt: session.created_at
    };
  }

  // Revoke token and remove session
  static async revokeToken(token, userId) {
    try {
      // Decode token to get expiration
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      const expiresAt = new Date(decoded.exp * 1000);

      // Check if token is already expired
      if (expiresAt < new Date()) {
        console.log('Token is already expired, skipping blacklist');
        // Still remove the session
        await ActiveSession.removeSession(token, userId);
        return { message: 'Token already expired, session removed' };
      }

      // Log token length for monitoring
      console.log(`Revoking token of length: ${token.length} characters`);

      // Add to blacklist
      if (token.length <= 1000) {
        try {
          const existing = await TokenBlacklist.findOne({
            where: { 
              token: token,
              user_id: userId
            }
          });

          if (!existing) {
            await TokenBlacklist.create({
              token: token,
              user_id: userId,
              expires_at: expiresAt
            });
          }
        } catch (error) {
          if (error.name !== 'SequelizeUniqueConstraintError') {
            throw error;
          }
        }
      } else {
        // For tokens > 1000 chars, store a hash
        console.warn(`Token exceeds 1000 characters (${token.length}), storing hash instead`);
        
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const hashIdentifier = `HASH:${tokenHash}`;
        
        try {
          const existing = await TokenBlacklist.findOne({
            where: { 
              token: hashIdentifier,
              user_id: userId
            }
          });

          if (!existing) {
            await TokenBlacklist.create({
              token: hashIdentifier,
              user_id: userId,
              expires_at: expiresAt
            });
          }
        } catch (error) {
          if (error.name !== 'SequelizeUniqueConstraintError') {
            throw error;
          }
        }
      }

      // Remove from active sessions
      await ActiveSession.removeSession(token, userId);
      
      console.log(`Token revoked and session removed for user ${userId}`);
      return { message: 'Token revoked and session ended' };
      
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }

  // Force logout a user (admin function)
  static async forceLogoutUser(userId, adminId) {
    try {
      // Get user's current session
      const session = await ActiveSession.getUserSession(userId);
      
      if (session) {
        // We don't have the actual token, but we can still remove the session
        await ActiveSession.forceLogout(userId);
        console.log(`User ${userId} force logged out by admin ${adminId}`);
        return { success: true, message: 'User has been logged out' };
      } else {
        return { success: false, message: 'User has no active session' };
      }
    } catch (error) {
      console.error('Error forcing logout:', error);
      throw error;
    }
  }

  // Clean up expired tokens and sessions
  static async cleanUpExpiredTokens() {
    try {
      const tokenCount = await TokenBlacklist.cleanupExpiredTokens();
      const sessionCount = await ActiveSession.cleanupExpiredSessions();
      
      console.log(`Cleaned up ${tokenCount} expired tokens and ${sessionCount} expired sessions`);
      return { tokens: tokenCount, sessions: sessionCount };
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  // Get token info (for debugging)
  static getTokenInfo(token) {
    try {
      const decoded = jwt.decode(token);
      return {
        length: token.length,
        userId: decoded?.id,
        username: decoded?.username,
        expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null,
        issuedAt: decoded?.iat ? new Date(decoded.iat * 1000) : null,
        willBeHashed: token.length > 1000
      };
    } catch (error) {
      return {
        length: token?.length || 0,
        error: 'Failed to decode token'
      };
    }
  }
}

// Set up cleanup job (runs every hour)
setInterval(() => {
  TokenService.cleanUpExpiredTokens().catch(error => {
    console.error('Scheduled cleanup failed:', error);
  });
}, 60 * 60 * 1000);

// Also run cleanup on startup (after 10 seconds)
setTimeout(() => {
  console.log('Running initial token and session cleanup...');
  TokenService.cleanUpExpiredTokens().catch(error => {
    console.error('Initial cleanup failed:', error);
  });
}, 10000);

module.exports = TokenService;