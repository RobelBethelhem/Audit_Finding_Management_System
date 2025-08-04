const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AuditFindingEscalation = sequelize.define('AuditFindingEscalation', {
    escalation_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    finding_id: {
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
    escalated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    escalation_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  }, {
    tableName: 'audit_finding_escalations',
    timestamps: true,
    underscored: true,
  });

  AuditFindingEscalation.associate = (models) => {
    AuditFindingEscalation.belongsTo(models.AuditFinding, { foreignKey: 'finding_id' });
    AuditFindingEscalation.belongsTo(models.User, { as: 'escalatedTo', foreignKey: 'escalated_to_id' });
    AuditFindingEscalation.belongsTo(models.User, { as: 'escalatedBy', foreignKey: 'escalated_by_id' });
  };

  return AuditFindingEscalation;
};