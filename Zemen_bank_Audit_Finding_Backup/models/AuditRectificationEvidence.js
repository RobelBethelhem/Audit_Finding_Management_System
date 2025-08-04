const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AuditRectificationEvidence = sequelize.define('AuditRectificationEvidence', {
    evidence_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    rectification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'audit_finding_rectifications',
        key: 'rectification_id',
      },
      onDelete: 'CASCADE',
    },
    rectification_evidence_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rectification_file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rectification_file_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'audit_rectification_evidences',
    timestamps: true,
    underscored: true,
  });

  AuditRectificationEvidence.associate = (models) => {
    AuditRectificationEvidence.belongsTo(models.AuditFindingRectification, {
      foreignKey: 'rectification_id',
      as: 'rectification',
    });
  };

  return AuditRectificationEvidence;
};