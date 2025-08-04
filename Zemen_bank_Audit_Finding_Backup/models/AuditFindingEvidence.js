const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditFindingEvidence = sequelize.define('AuditFindingEvidence', {
    evidence_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    audit_finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'audit_findings',
        key: 'id'
      }
    },
    uploaded_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    original_file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    }
  }, {
    tableName: 'audit_finding_evidences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  });

  // Define associations
  AuditFindingEvidence.associate = (models) => {
    // Belongs to AuditFinding
    AuditFindingEvidence.belongsTo(models.AuditFinding, {
      foreignKey: 'audit_finding_id',
      as: 'auditFinding'
    });

    // Belongs to User (uploaded by)
    AuditFindingEvidence.belongsTo(models.User, {
      foreignKey: 'uploaded_by_id',
      as: 'uploadedBy'
    });
  };

  return AuditFindingEvidence;
};
