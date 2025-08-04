const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const EscalationNotification = sequelize.define('EscalationNotification', {
    notification_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    audit_finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    escalated_to_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    escalated_by_id: {
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
    escalation_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  }, {
    tableName: 'escalation_notifications',
    timestamps: true,
    underscored: true,
  });

  EscalationNotification.associate = (models) => {
    EscalationNotification.belongsTo(models.AuditFinding, { foreignKey: 'audit_finding_id' });
    EscalationNotification.belongsTo(models.User, { as: 'escalatedTo', foreignKey: 'escalated_to_id' });
    EscalationNotification.belongsTo(models.User, { as: 'escalatedBy', foreignKey: 'escalated_by_id' });
  };

  return EscalationNotification;
};