const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AssignedNotification = sequelize.define('AssignedNotification', {
    notification_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    audit_finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'assigned_notifications',
    underscored: true,
    timestamps: true,
  });

  AssignedNotification.associate = (models) => {
    AssignedNotification.belongsTo(models.AuditFinding, { foreignKey: 'audit_finding_id' });
    AssignedNotification.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return AssignedNotification;
};