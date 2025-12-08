// models/MessageReaction.js
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const MessageReaction = sequelize.define('MessageReaction', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    message_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'messages',
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
    reaction: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '🎉', '👀', '🤔', '💯']]
      }
    }
  }, {
    underscored: true,
    tableName: 'message_reactions',
    indexes: [
      {
        unique: true,
        fields: ['message_id', 'user_id', 'reaction'],
        name: 'unique_user_reaction_per_message'
      }
    ]
  });

  MessageReaction.associate = (models) => {
    MessageReaction.belongsTo(models.Message, { foreignKey: 'message_id' });
    MessageReaction.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return MessageReaction;
};

// Add to Message model associations:
// Message.hasMany(models.MessageReaction, { foreignKey: 'message_id' });

