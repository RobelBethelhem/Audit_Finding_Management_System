'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuditFindingBranchAssignment extends Model {
    static associate(models) {
      // Association with AuditFinding
      AuditFindingBranchAssignment.belongsTo(models.AuditFinding, {
        foreignKey: 'audit_finding_id',
        as: 'auditFinding'
      });

      // Association with Branch
      AuditFindingBranchAssignment.belongsTo(models.Branch, {
        foreignKey: 'assigned_branch_id',
        as: 'assignedBranch'
      });

      // Association with User who assigned to branch
      AuditFindingBranchAssignment.belongsTo(models.User, {
        foreignKey: 'branch_assigned_by_id',
        as: 'branchAssignedBy'
      });
    }

    // Instance method to check if assignment is current
    isCurrentAssignment() {
      return true; // Since we only allow one assignment per finding
    }

    // Static method to get active assignment for a finding
    static async getActiveAssignmentForFinding(findingId) {
      return await this.findOne({
        where: {
          audit_finding_id: findingId
        },
        include: [
          {
            model: this.sequelize.models.Branch,
            as: 'assignedBranch',
            attributes: ['id', 'branch_code', 'branch_name']
          },
          {
            model: this.sequelize.models.User,
            as: 'branchAssignedBy',
            attributes: ['id', 'username', 'email', 'department', 'role']
          }
        ]
      });
    }

    // Static method to get all assignments for a branch
    static async getAssignmentsForBranch(branchId, options = {}) {
      const { page = 1, limit = 10, includeFinding = true } = options;
      const offset = (page - 1) * limit;

      const includeArray = [
        {
          model: this.sequelize.models.Branch,
          as: 'assignedBranch',
          attributes: ['id', 'branch_code', 'branch_name']
        },
        {
          model: this.sequelize.models.User,
          as: 'branchAssignedBy',
          attributes: ['id', 'username', 'email', 'department', 'role']
        }
      ];

      if (includeFinding) {
        includeArray.push({
          model: this.sequelize.models.AuditFinding,
          as: 'auditFinding',
          attributes: ['id', 'title', 'status', 'created_at', 'due_date']
        });
      }

      return await this.findAndCountAll({
        where: {
          assigned_branch_id: branchId
        },
        include: includeArray,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['branch_assigned_at', 'DESC']]
      });
    }


  }

  AuditFindingBranchAssignment.init({
    assignment_id: {
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
    assigned_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    branch_assigned_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    branch_assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AuditFindingBranchAssignment',
    tableName: 'audit_finding_branch_assignments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['audit_finding_id'],
        unique: true,
        name: 'idx_audit_finding_branch_assignments_unique_finding'
      },
      {
        fields: ['assigned_branch_id'],
        name: 'idx_audit_finding_branch_assignments_branch'
      },
      {
        fields: ['branch_assigned_by_id'],
        name: 'idx_audit_finding_branch_assignments_assigned_by'
      }
    ]
  });

  return AuditFindingBranchAssignment;
};
