'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AuditAmendmentHistory extends Model {
    static associate(models) {
      // Define associations here
      AuditAmendmentHistory.belongsTo(models.AuditFinding, {
        foreignKey: 'audit_finding_id',
        as: 'auditFinding'
      });
      AuditAmendmentHistory.belongsTo(models.User, {
        foreignKey: 'amend_by_id',
        as: 'amendedBy'
      });
      AuditAmendmentHistory.belongsTo(models.AuditFindingRectification, {
        foreignKey: 'rectification_id',
        as: 'rectification'
      });
      AuditAmendmentHistory.belongsTo(models.RiskLevel, {
        foreignKey: 'risk_level_id',
        as: 'riskLevel'
      });
      AuditAmendmentHistory.belongsTo(models.Category, {
        foreignKey: 'category_id',
        as: 'category'
      });
      AuditAmendmentHistory.belongsTo(models.RiskRating, {
        foreignKey: 'risk_rating_id',
        as: 'riskRating'
      });
      AuditAmendmentHistory.belongsTo(models.User, {
        foreignKey: 'created_by_id',
        as: 'createdBy'
      });
    }
  }
  
  AuditAmendmentHistory.init({
    amendment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    audit_finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'audit_findings',
        key: 'id'
      }
    },
    amend_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    criteria: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cause: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    impact: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    risk_level_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'risk_levels',
        key: 'id'
      }
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    risk_rating_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'risk_ratings',
        key: 'id'
      }
    },
    // New IT_Audit specific fields
    vulnerability_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'system_vulnerabilities',
        key: 'id'
      }
    },
    compliance_gap_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'compliance_gaps',
        key: 'id'
      }
    },
    standard_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'relevant_standards',
        key: 'id'
      }
    },
    created_by_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved'),
      allowNull: true,
      defaultValue: 'Pending'
    },
    rectification_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rectifications',
        key: 'id'
      }
    },
    amended_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AuditAmendmentHistory',
    tableName: 'audit_amendment_histories',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['audit_finding_id'],
        name: 'idx_amendment_audit_finding'
      },
      {
        fields: ['amend_by_id'],
        name: 'idx_amendment_amend_by'
      },
      // New indexes for IT_Audit fields
      {
        fields: ['vulnerability_id'],
        name: 'idx_amendment_vulnerability'
      },
      {
        fields: ['compliance_gap_id'],
        name: 'idx_amendment_compliance_gap'
      },
      {
        fields: ['standard_id'],
        name: 'idx_amendment_standard'
      }
    ]
  });

  return AuditAmendmentHistory;
};
