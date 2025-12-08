// models/Message.js
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
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
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true // Can be null if it's a file-only message
    },
    message_type: {
      type: DataTypes.ENUM('text', 'file', 'image', 'document'),
      defaultValue: 'text'
    },
    parent_message_id: {
      type: DataTypes.UUID,
      allowNull: true, // For replies
      references: {
        model: 'messages',
        key: 'id'
      }
    },
    is_edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    edited_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    underscored: true,
    tableName: 'messages'
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Conversation, { foreignKey: 'conversation_id' });
    Message.belongsTo(models.User, { as: 'sender', foreignKey: 'sender_id' });
    Message.belongsTo(models.Message, { as: 'parentMessage', foreignKey: 'parent_message_id' });
    Message.hasMany(models.Message, { as: 'replies', foreignKey: 'parent_message_id' });
    Message.hasMany(models.MessageAttachment, { foreignKey: 'message_id' });
    Message.hasMany(models.MessageReadStatus, { foreignKey: 'message_id' });
    Message.hasMany(models.MessageReaction, { foreignKey: 'message_id' });
  };

  return Message;
};

