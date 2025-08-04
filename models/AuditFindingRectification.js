const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AuditFindingRectification = sequelize.define('AuditFindingRectification', {
    rectification_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    submitted_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rectification_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Amended'),
      defaultValue: 'Pending',
      allowNull: false,
    },
    reason:{
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approved_by_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'audit_finding_rectifications',
    timestamps: true,
    underscored: true,
  });

  AuditFindingRectification.associate = (models) => {
    AuditFindingRectification.belongsTo(models.AuditFinding, { foreignKey: 'finding_id' });
    AuditFindingRectification.belongsTo(models.User, { as: 'submittedBy', foreignKey: 'submitted_by_id' });
    AuditFindingRectification.belongsTo(models.User, { as: 'approvedBy', foreignKey: 'approved_by_id' });
    AuditFindingRectification.hasMany(models.AuditRectificationEvidence, { foreignKey: 'rectification_id' });
    AuditFindingRectification.hasMany(models.AuditRectificationAmendmentHistory, { foreignKey: 'rectification_id' });
  };

  return AuditFindingRectification;
}; 