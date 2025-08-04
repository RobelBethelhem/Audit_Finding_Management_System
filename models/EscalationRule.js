const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const EscalationRule = sequelize.define('EscalationRule', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    department: {
      type: DataTypes.ENUM('Business', 'IT_Audit', 'Inspection'),
      allowNull: false
    },
    risk_level_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    risk_rating_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    vulnerability_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    compliance_gap_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    standard_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    escalation_level: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    days_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    escalate_to_role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    send_reminder_days_before: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'escalation_rules',
    timestamps: true,
    underscored: true
  });

  EscalationRule.associate = (models) => {
    EscalationRule.belongsTo(models.RiskLevel, { foreignKey: 'risk_level_id' });
    EscalationRule.belongsTo(models.Category, { foreignKey: 'category_id' });
    EscalationRule.belongsTo(models.RiskRating, { foreignKey: 'risk_rating_id' });
    EscalationRule.belongsTo(models.SystemVulnerability, { foreignKey: 'vulnerability_id' });
    EscalationRule.belongsTo(models.ComplianceGap, { foreignKey: 'compliance_gap_id' });
    EscalationRule.belongsTo(models.RelevantStandard, { foreignKey: 'standard_id' });
  };

  return EscalationRule;
};