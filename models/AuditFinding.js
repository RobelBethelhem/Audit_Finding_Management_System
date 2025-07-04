const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AuditFinding = sequelize.define('AuditFinding', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    criteria: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cause:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    impact:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    recommendation:{
      type: DataTypes.STRING,
      allowNull: false,
    },

    amount:{
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    risk_level_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    
    category_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    
    risk_rating_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_by_id: { 
      type: DataTypes.UUID,
      allowNull: false,
    },
   

    status:{
      type: DataTypes.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved'),
      defaultValue: 'Pending'
    },

    rectification_id:{
      type: DataTypes.UUID,
      allowNull: true,
    },
    
  }, {
    tableName: 'audit_findings',
    timestamps: true,
    indexes: [
      {
        fields: ['risk_level_id'],
        name: 'idx_audit_finding_risk_level'
      },
      {
        fields: ['category_id'],
        name: 'idx_audit_finding_category'
      },
      {
        fields: ['risk_rating_id'],
        name: 'idx_audit_finding_risk_rating'
      }
    ]
  });

  AuditFinding.associate = (models) => {
    AuditFinding.belongsTo(models.Category, { foreignKey: 'category_id' });
    AuditFinding.belongsTo(models.RiskLevel, { foreignKey: 'risk_level_id' });
    AuditFinding.belongsTo(models.RiskRating, { foreignKey: 'risk_rating_id' });
    AuditFinding.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by_id' });
    AuditFinding.hasMany(models.AuditFindingAssigned, { foreignKey: 'finding_id' });
    AuditFinding.hasMany(models.AuditFindingEscalation, { foreignKey: 'finding_id' });
    AuditFinding.hasMany(models.AuditFindingRectification, { foreignKey: 'finding_id' });
    AuditFinding.hasMany(models.AuditAmendmentHistory, { foreignKey: 'audit_finding_id' });
    AuditFinding.hasMany(models.ActionPlan, { foreignKey: 'audit_finding_id' });
    AuditFinding.hasMany(models.AssignedNotification, { foreignKey: 'audit_finding_id' });
    AuditFinding.hasMany(models.EscalationNotification, { foreignKey: 'audit_finding_id' });
  };

  return AuditFinding;
}; 