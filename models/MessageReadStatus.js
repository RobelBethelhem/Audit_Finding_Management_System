// models/MessageReadStatus.js
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const MessageReadStatus = sequelize.define('MessageReadStatus', {
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
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    underscored: true,
    tableName: 'message_read_statuses',
    indexes: [
      {
        unique: true,
        fields: ['message_id', 'user_id']
      }
    ]
  });

  MessageReadStatus.associate = (models) => {
    MessageReadStatus.belongsTo(models.Message, { foreignKey: 'message_id' });
    MessageReadStatus.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return MessageReadStatus;
};
