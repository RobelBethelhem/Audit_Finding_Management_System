'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InspectorBranchAssignment extends Model {
    static associate(models) {
      // Association with Inspector (User)
      InspectorBranchAssignment.belongsTo(models.User, {
        foreignKey: 'inspector_id',
        as: 'inspector'
      });

      // Association with Branch
      InspectorBranchAssignment.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });

      // Association with User who created the assignment
      InspectorBranchAssignment.belongsTo(models.User, {
        foreignKey: 'assigned_by_id',
        as: 'assignedBy'
      });
    }

    // Instance method to check if assignment is currently active
    isCurrentlyActive() {
      const now = new Date();
      const startDate = new Date(this.start_date);
      const endDate = this.end_date ? new Date(this.end_date) : null;

      return this.is_active && 
             startDate <= now && 
             (!endDate || endDate >= now);
    }

    // Instance method to deactivate assignment
    async deactivate() {
      this.is_active = false;
      this.end_date = new Date();
      await this.save();
    }

    // Static method to get active assignments for an inspector
    static async getActiveAssignmentsForInspector(inspectorId) {
      const now = new Date();
      
      return await this.findAll({
        where: {
          inspector_id: inspectorId,
          is_active: true,
          start_date: {
            [Op.lte]: now
          },
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: now } }
          ]
        },
        include: [
          {
            model: this.sequelize.models.Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name', 'is_active'],
            where: { is_active: true }
          }
        ],
        order: [['start_date', 'DESC']]
      });
    }

    // Static method to get all assignments for a branch
    static async getAssignmentsForBranch(branchId, options = {}) {
      const { page = 1, limit = 10, includeInactive = false } = options;
      const offset = (page - 1) * limit;

      const whereClause = {
        branch_id: branchId
      };

      if (!includeInactive) {
        whereClause.is_active = true;
      }

      return await this.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: this.sequelize.models.User,
            as: 'inspector',
            attributes: ['id', 'username', 'email', 'role', 'department']
          },
          {
            model: this.sequelize.models.Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name']
          },
          {
            model: this.sequelize.models.User,
            as: 'assignedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
    }

    // Static method to get all assignments with filters
    static async getAllAssignments(options = {}) {
      const { 
        page = 1, 
        limit = 10, 
        inspectorId = null, 
        branchId = null, 
        isActive = null,
        search = null 
      } = options;
      const offset = (page - 1) * limit;

      const whereClause = {};
      
      if (inspectorId) whereClause.inspector_id = inspectorId;
      if (branchId) whereClause.branch_id = branchId;
      if (isActive !== null) whereClause.is_active = isActive;

      const includeArray = [
        {
          model: this.sequelize.models.User,
          as: 'inspector',
          attributes: ['id', 'username', 'email', 'role', 'department'],
          where: search ? {
            [Op.or]: [
              { username: { [Op.like]: `%${search}%` } },
              { email: { [Op.like]: `%${search}%` } }
            ]
          } : undefined
        },
        {
          model: this.sequelize.models.Branch,
          as: 'branch',
          attributes: ['id', 'branch_code', 'branch_name'],
          where: search ? {
            [Op.or]: [
              { branch_code: { [Op.like]: `%${search}%` } },
              { branch_name: { [Op.like]: `%${search}%` } }
            ]
          } : undefined
        },
        {
          model: this.sequelize.models.User,
          as: 'assignedBy',
          attributes: ['id', 'username', 'email', 'role']
        }
      ];

      return await this.findAndCountAll({
        where: whereClause,
        include: includeArray,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
    }

    // Static method to check if inspector can be assigned to branch
    static async canAssignInspectorToBranch(inspectorId, branchId) {
      // Check if there's already an active assignment
      const existingAssignment = await this.findOne({
        where: {
          inspector_id: inspectorId,
          branch_id: branchId,
          is_active: true,
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: new Date() } }
          ]
        }
      });

      return !existingAssignment;
    }

    // Static method to create new assignment with validation
    static async createAssignment(data) {
      const { inspector_id, branch_id, assigned_by_id, start_date, end_date } = data;

      // Validate that inspector can be assigned
      const canAssign = await this.canAssignInspectorToBranch(inspector_id, branch_id);
      if (!canAssign) {
        throw new Error('Inspector is already assigned to this branch');
      }

      // Validate inspector role
      const inspector = await this.sequelize.models.User.findByPk(inspector_id);
      if (!inspector || inspector.role !== 'Inspection_Auditors') {
        throw new Error('Only Inspection_Auditors can be assigned to branches');
      }

      // Validate branch exists and is active
      const branch = await this.sequelize.models.Branch.findByPk(branch_id);
      if (!branch || !branch.is_active) {
        throw new Error('Branch not found or inactive');
      }

      return await this.create({
        inspector_id,
        branch_id,
        assigned_by_id,
        start_date: start_date || new Date(),
        end_date,
        is_active: true
      });
    }
  }

  InspectorBranchAssignment.init({
    assignment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    inspector_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    assigned_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'InspectorBranchAssignment',
    tableName: 'inspector_branch_assignments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['inspector_id'],
        name: 'idx_inspector_branch_assignments_inspector'
      },
      {
        fields: ['branch_id'],
        name: 'idx_inspector_branch_assignments_branch'
      },
      {
        fields: ['assigned_by_id'],
        name: 'idx_inspector_branch_assignments_assigned_by'
      },
      {
        fields: ['is_active'],
        name: 'idx_inspector_branch_assignments_active'
      },
      {
        fields: ['start_date', 'end_date'],
        name: 'idx_inspector_branch_assignments_dates'
      },
      {
        fields: ['inspector_id', 'is_active'],
        name: 'idx_inspector_branch_assignments_inspector_active'
      }
    ]
  });

  return InspectorBranchAssignment;
};
