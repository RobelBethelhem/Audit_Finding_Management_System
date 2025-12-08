// models/ConversationParticipant.js
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ConversationParticipant = sequelize.define('ConversationParticipant', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      defaultValue: 'member'
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    last_read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_muted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    underscored: true,
    tableName: 'conversation_participants',
    indexes: [
      {
        unique: true,
        fields: ['conversation_id', 'user_id']
      }
    ]
  });

  ConversationParticipant.associate = (models) => {
    ConversationParticipant.belongsTo(models.Conversation, { foreignKey: 'conversation_id' });
    ConversationParticipant.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return ConversationParticipant;
};

