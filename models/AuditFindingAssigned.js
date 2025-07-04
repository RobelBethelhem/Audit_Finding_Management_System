// const { v4: uuidv4 } = require('uuid');

// module.exports = (sequelize, DataTypes) => {
//   const AuditFindingAssigned = sequelize.define('AuditFindingAssigned', {
//     assigned_id: {
//       type: DataTypes.UUID,
//       defaultValue: () => uuidv4(),
//       primaryKey: true,
//     },
//     finding_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//     assigned_to_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//     assigned_at: {
//       type: DataTypes.DATE,
//       allowNull: false,
//       defaultValue: DataTypes.NOW,
//     },
//   }, {
//     tableName: 'audit_finding_assigned',
//     timestamps: true,
//   });

//   AuditFindingAssigned.associate = (models) => {
//     AuditFindingAssigned.belongsTo(models.AuditFinding, { foreignKey: 'finding_id' });
//     AuditFindingAssigned.belongsTo(models.User, { as: 'assignedTo', foreignKey: 'assigned_to_id' });
//   };

//   return AuditFindingAssigned;
// }; 


'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuditFindingAssigned extends Model {
    static associate(models) {
      AuditFindingAssigned.belongsTo(models.AuditFinding, {
        foreignKey: 'finding_id',
        as: 'auditFinding'
      });
      AuditFindingAssigned.belongsTo(models.User, {
        foreignKey: 'assigned_to_id',
        as: 'assignedToUser'  // Changed from 'assignedTo' to 'assignedToUser'
      });
    }
  }

  AuditFindingAssigned.init({
    assigned_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'audit_findings',
        key: 'id'
      }
    },
    assigned_to_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AuditFindingAssigned',
    tableName: 'audit_finding_assigned',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['finding_id'],
        name: 'idx_audit_finding_assigned_finding'
      },
      {
        fields: ['assigned_to_id'],
        name: 'idx_audit_finding_assigned_user'
      },
      {
        fields: ['finding_id', 'assigned_to_id'],
        unique: true,
        name: 'idx_audit_finding_assigned_unique'
      }
    ]
  });

  return AuditFindingAssigned;
};