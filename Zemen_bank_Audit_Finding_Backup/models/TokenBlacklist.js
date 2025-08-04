const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TokenBlacklist = sequelize.define('TokenBlacklist', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
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
  });

  // Add a class method to check if token is blacklisted
  TokenBlacklist.isTokenBlacklisted = async function(token) {
    const blacklistedToken = await this.findOne({
      where: { token }
    });
    return !!blacklistedToken;
  };

  // Add a class method to clean up expired tokens
  TokenBlacklist.cleanupExpiredTokens = async function() {
    return this.destroy({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  return TokenBlacklist;
}; 