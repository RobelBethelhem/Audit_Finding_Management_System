// const { DataTypes } = require('sequelize');

// module.exports = (sequelize) => {
//   const TokenBlacklist = sequelize.define('TokenBlacklist', {
//     id: {
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//       primaryKey: true,
//     },
//     token: {
//       type: DataTypes.STRING(1000),
//       allowNull: false,
//       unique: true,
//     },
//     expires_at: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//     user_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//       references: {
//         model: 'users',
//         key: 'id',
//       }
//     }
//   }, {
//     tableName: 'token_blacklist',
//     timestamps: true,
//     underscored: true,
//     paranoid: false,
//   });

//   // Add a class method to check if token is blacklisted
//   TokenBlacklist.isTokenBlacklisted = async function(token) {
//     const blacklistedToken = await this.findOne({
//       where: { token }
//     });
//     return !!blacklistedToken;
//   };

//   // Add a class method to clean up expired tokens
//   TokenBlacklist.cleanupExpiredTokens = async function() {
//     return this.destroy({
//       where: {
//         expires_at: {
//           [sequelize.Sequelize.Op.lt]: new Date()
//         }
//       }
//     });
//   };

//   return TokenBlacklist;
// }; 


// models/TokenBlacklist.js
const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const TokenBlacklist = sequelize.define('TokenBlacklist', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING(1000), // Can store up to 1000 characters
      allowNull: false,
      // Don't set unique: true here, handled by index in migration
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      }
    }
  }, {
    tableName: 'token_blacklist',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['expires_at'],
        name: 'expires_at_idx'
      },
      {
        fields: ['user_id'],
        name: 'user_id_idx'
      }
    ]
  });

  // Associations
  TokenBlacklist.associate = (models) => {
    TokenBlacklist.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Static methods
  
  // Check if token is blacklisted (handles both regular tokens and hashes)
  TokenBlacklist.isTokenBlacklisted = async function(token) {
    try {
      const { Op } = sequelize.Sequelize;
      
      // Only check non-expired tokens
      const whereClause = {
        expires_at: {
          [Op.gt]: new Date()
        }
      };

      // For tokens <= 1000 chars, check directly
      if (token.length <= 1000) {
        const blacklistedToken = await this.findOne({
          where: {
            ...whereClause,
            token: token
          }
        });
        
        if (blacklistedToken) return true;
      }
      
      // For longer tokens or as a fallback, check the hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const hashIdentifier = `HASH:${tokenHash}`;
      
      const blacklistedHash = await this.findOne({
        where: {
          ...whereClause,
          token: hashIdentifier
        }
      });
      
      return !!blacklistedHash;
    } catch (error) {
      console.error('Error checking if token is blacklisted:', error);
      // On error, consider token as blacklisted for safety
      return true;
    }
  };

  // Clean up expired tokens
  TokenBlacklist.cleanupExpiredTokens = async function() {
    const { Op } = sequelize.Sequelize;
    
    try {
      const result = await this.destroy({
        where: {
          expires_at: {
            [Op.lt]: new Date()
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      throw error;
    }
  };

  // Add a token to the blacklist with automatic handling of long tokens
  TokenBlacklist.blacklistToken = async function(token, userId, expiresAt) {
    try {
      // Check token length
      let tokenToStore = token;
      
      // For tokens > 1000 chars, store a hash instead
      if (token.length > 1000) {
        console.warn(`Token exceeds 1000 characters (${token.length}), storing hash instead`);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        tokenToStore = `HASH:${tokenHash}`;
      }

      // Check if already exists
      const existing = await this.findOne({
        where: { 
          token: tokenToStore,
          user_id: userId
        }
      });
      
      if (existing) {
        console.log('Token is already blacklisted');
        return existing;
      }

      return await this.create({
        token: tokenToStore,
        user_id: userId,
        expires_at: expiresAt
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('Token is already blacklisted (unique constraint)');
        return null;
      }
      throw error;
    }
  };

  // Get user's blacklisted tokens (for admin/debugging)
  TokenBlacklist.getUserBlacklistedTokens = async function(userId) {
    const { Op } = sequelize.Sequelize;
    
    return this.findAll({
      where: {
        user_id: userId,
        expires_at: {
          [Op.gt]: new Date()
        }
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'user_id', 'expires_at', 'created_at']
      // Don't return the actual token for security
    });
  };

  // Count active blacklisted tokens
  TokenBlacklist.countActiveTokens = async function() {
    const { Op } = sequelize.Sequelize;
    
    return this.count({
      where: {
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });
  };

  // Helper method to hash tokens
  TokenBlacklist.hashToken = function(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  };

  return TokenBlacklist;
};