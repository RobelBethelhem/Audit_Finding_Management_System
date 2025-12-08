// // models/ActiveSession.js
// const { DataTypes } = require('sequelize');
// const crypto = require('crypto');

// module.exports = (sequelize) => {
//   const ActiveSession = sequelize.define('ActiveSession', {
//     id: {
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//       primaryKey: true,
//     },
//     user_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//       unique: true, // Only one active session per user
//       references: {
//         model: 'users',
//         key: 'id',
//       },
//       onDelete: 'CASCADE'
//     },
//     token_hash: {
//       type: DataTypes.STRING(64), // SHA-256 hash
//       allowNull: false,
//       unique: true
//     },
//     ip_address: {
//       type: DataTypes.STRING(45), // Supports IPv6
//       allowNull: true
//     },
//     user_agent: {
//       type: DataTypes.TEXT,
//       allowNull: true
//     },
//     device_info: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },
//     last_activity: {
//       type: DataTypes.DATE,
//       defaultValue: DataTypes.NOW
//     },
//     expires_at: {
//       type: DataTypes.DATE,
//       allowNull: false
//     }
//   }, {
//     tableName: 'active_sessions',
//     timestamps: true,
//     underscored: true,
//     paranoid: false,
//     indexes: [
//       {
//         unique: true,
//         fields: ['user_id'],
//         name: 'user_id_unique_idx'
//       },
//       {
//         unique: true,
//         fields: ['token_hash'],
//         name: 'token_hash_unique_idx'
//       },
//       {
//         fields: ['expires_at'],
//         name: 'expires_at_idx'
//       }
//     ]
//   });

//   // Hash token for storage
//   ActiveSession.hashToken = function(token) {
//     return crypto.createHash('sha256').update(token).digest('hex');
//   };

//   // Create or update active session
//   ActiveSession.createSession = async function(userId, token, expiresAt, requestInfo = {}) {
//     const tokenHash = this.hashToken(token);
    
//     try {
//       // First, remove any existing session for this user
//       await this.destroy({
//         where: { user_id: userId }
//       });

//       // Create new session
//       return await this.create({
//         user_id: userId,
//         token_hash: tokenHash,
//         expires_at: expiresAt,
//         ip_address: requestInfo.ip,
//         user_agent: requestInfo.userAgent,
//         device_info: requestInfo.device,
//         last_activity: new Date()
//       });
//     } catch (error) {
//       console.error('Error creating session:', error);
//       throw error;
//     }
//   };

//   // Check if token is the active session
//   ActiveSession.isActiveSession = async function(token, userId) {
//     const tokenHash = this.hashToken(token);
//     const { Op } = sequelize.Sequelize;
    
//     const session = await this.findOne({
//       where: {
//         user_id: userId,
//         token_hash: tokenHash,
//         expires_at: {
//           [Op.gt]: new Date()
//         }
//       }
//     });

//     return !!session;
//   };

//   // Get active session for user
//   ActiveSession.getUserSession = async function(userId) {
//     const { Op } = sequelize.Sequelize;
    
//     return this.findOne({
//       where: {
//         user_id: userId,
//         expires_at: {
//           [Op.gt]: new Date()
//         }
//       }
//     });
//   };

//   // Update last activity
//   ActiveSession.updateActivity = async function(token) {
//     const tokenHash = this.hashToken(token);
    
//     return this.update(
//       { last_activity: new Date() },
//       { 
//         where: { token_hash: tokenHash }
//       }
//     );
//   };

//   // Remove session (logout)
//   ActiveSession.removeSession = async function(token, userId) {
//     const tokenHash = this.hashToken(token);
    
//     return this.destroy({
//       where: {
//         token_hash: tokenHash,
//         user_id: userId
//       }
//     });
//   };

//   // Clean up expired sessions
//   ActiveSession.cleanupExpiredSessions = async function() {
//     const { Op } = sequelize.Sequelize;
    
//     return this.destroy({
//       where: {
//         expires_at: {
//           [Op.lt]: new Date()
//         }
//       }
//     });
//   };

//   // Force logout user (removes their active session)
//   ActiveSession.forceLogout = async function(userId) {
//     return this.destroy({
//       where: { user_id: userId }
//     });
//   };

//   return ActiveSession;
// };


// models/ActiveSession.js
const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const ActiveSession = sequelize.define('ActiveSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // Only one active session per user
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE'
    },
    token_hash: {
      type: DataTypes.STRING(64), // SHA-256 hash
      allowNull: false,
      unique: true
    },
    ip_address: {
      type: DataTypes.STRING(45), // Supports IPv6
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    device_info: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_activity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'active_sessions',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id'],
        name: 'user_id_unique_idx'
      },
      {
        unique: true,
        fields: ['token_hash'],
        name: 'token_hash_unique_idx'
      },
      {
        fields: ['expires_at'],
        name: 'expires_at_idx'
      }
    ]
  });

  // Associations
  ActiveSession.associate = (models) => {
    ActiveSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Static methods
  
  // Hash token for storage
  ActiveSession.hashToken = function(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  };

  ActiveSession.createSession = async function(userId, token, expiresAt, requestInfo = {}) {
    const tokenHash = this.hashToken(token);
    
    try {
      console.log('Creating session for user:', userId);
      
      // First, remove any existing session for this user
      const deleted = await this.destroy({
        where: { user_id: userId }
      });
      console.log('Deleted existing sessions:', deleted);

      // Create new session
      const session = await this.create({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: requestInfo.ip || null,
        user_agent: requestInfo.userAgent || null,
        device_info: requestInfo.device || null,
        last_activity: new Date()
      });
      
      console.log('Session created:', session.id);
      return session;
    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  };

  // Add all other methods...
  ActiveSession.isActiveSession = async function(token, userId) {
    const tokenHash = this.hashToken(token);
    const { Op } = sequelize.Sequelize;
    
    const session = await this.findOne({
      where: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });

    return !!session;
  };

  ActiveSession.getUserSession = async function(userId) {
    const { Op } = sequelize.Sequelize;
    
    return this.findOne({
      where: {
        user_id: userId,
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });
  };

  ActiveSession.updateActivity = async function(token) {
    const tokenHash = this.hashToken(token);
    
    return this.update(
      { last_activity: new Date() },
      { 
        where: { token_hash: tokenHash }
      }
    );
  };

  ActiveSession.removeSession = async function(token, userId) {
    const tokenHash = this.hashToken(token);
    
    return this.destroy({
      where: {
        token_hash: tokenHash,
        user_id: userId
      }
    });
  };

  ActiveSession.cleanupExpiredSessions = async function() {
    const { Op } = sequelize.Sequelize;
    
    return this.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    });
  };

  ActiveSession.forceLogout = async function(userId) {
    return this.destroy({
      where: { user_id: userId }
    });
  };

  // Associations
  ActiveSession.associate = (models) => {
    ActiveSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return ActiveSession;
};