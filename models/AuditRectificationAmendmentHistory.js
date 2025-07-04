'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AuditRectificationAmendmentHistory extends Model {
    static associate(models) {
      // Define associations here
      AuditRectificationAmendmentHistory.belongsTo(models.AuditFindingRectification, {
        foreignKey: 'rectification_id',
        as: 'auditFindingRectification'
      });
      AuditRectificationAmendmentHistory.belongsTo(models.User, {
        foreignKey: 'amend_by_id',
        as: 'amendedBy'
      });
    }
  }
  
  AuditRectificationAmendmentHistory.init({
    amendment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rectification_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'audit_finding_rectifications',
        key: 'rectification_id'
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
    rectification: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Submitted', 'Approved', 'Rejected', 'Amended'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amended_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AuditRectificationAmendmentHistory',
    tableName: 'audit_rectification_amendment_histories',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['rectification_id'],
        name: 'idx_rectification_amendment_rectification'
      },
      {
        fields: ['status'],
        name: 'idx_rectification_amendment_status'
      }
    ]
  });

  return AuditRectificationAmendmentHistory;
};