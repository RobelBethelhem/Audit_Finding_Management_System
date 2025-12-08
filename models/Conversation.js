// models/Conversation.js
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true // For group chats
    },
    type: {
      type: DataTypes.ENUM('direct', 'group'),
      defaultValue: 'direct'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true // Group avatar
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    underscored: true,
    tableName: 'conversations'
  });

  Conversation.associate = (models) => {
    Conversation.belongsTo(models.User, { as: 'creator', foreignKey: 'created_by' });
    Conversation.hasMany(models.ConversationParticipant, { foreignKey: 'conversation_id' });
    Conversation.hasMany(models.Message, { foreignKey: 'conversation_id' });
    Conversation.belongsToMany(models.User, {
      through: models.ConversationParticipant,
      as: 'participants',
      foreignKey: 'conversation_id',
      otherKey: 'user_id'
    });
  };

  return Conversation;
};

