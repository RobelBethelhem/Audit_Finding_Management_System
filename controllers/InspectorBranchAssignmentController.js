const { InspectorBranchAssignment, User, Branch } = require('../models');
const { Op } = require('sequelize');

class InspectorBranchAssignmentController {
  /**
   * Get all inspector branch assignments with pagination and filters
   */
  async getAllAssignments(req, res) {
    try {
      const currentUser = req.user;
      
      // Check if user has permission to view assignments
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role)) {
        return res.status(403).json({ 
          error: 'Only Inspection supervisors and directors can view inspector assignments' 
        });
      }

      const {
        page = 1,
        limit = 10,
        search = '',
        inspector_id = '',
        branch_id = '',
        is_active = null,
        start_date_from = '',
        start_date_to = '',
        end_date_from = '',
        end_date_to = ''
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        inspectorId: inspector_id || null,
        branchId: branch_id || null,
        isActive: is_active !== null ? is_active === 'true' : null,
        search: search || null,
        startDateFrom: start_date_from || null,
        startDateTo: start_date_to || null,
        endDateFrom: end_date_from || null,
        endDateTo: end_date_to || null
      };

      const result = await InspectorBranchAssignment.getAllAssignments(options);

      res.json({
        assignments: result.rows,
        total: result.count,
        page: parseInt(page),
        totalPages: Math.ceil(result.count / limit),
        limit: parseInt(limit)
      });

    } catch (error) {
      console.error('Error fetching inspector assignments:', error);
      res.status(500).json({ error: 'Error fetching inspector assignments' });
    }
  }

  /**
   * Create new inspector branch assignment
   */
  async createAssignment(req, res) {
    try {
      const currentUser = req.user;
      
      // Check if user has permission to create assignments
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role)) {
        return res.status(403).json({ 
          error: 'Only Inspection supervisors and directors can create inspector assignments' 
        });
      }

      const { inspector_id, assigned_branch_id, start_date, end_date } = req.body;
       const branch_id = assigned_branch_id

      // Validate required fields
      if (!inspector_id || !assigned_branch_id) {
        return res.status(400).json({
          error: 'Inspector ID and Branch ID are required'
        });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({
          error: 'Start date and end date are required'
        });
      }

      // Validate date range
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format'
        });
      }

      if (endDate <= startDate) {
        return res.status(400).json({
          error: 'End date must be after start date'
        });
      }

      // Validate inspector exists and has correct role
      const inspector = await User.findByPk(inspector_id);
      if (!inspector) {
        return res.status(404).json({ error: 'Inspector not found' });
      }

      if (inspector.role !== 'Inspection_Auditors') {
        return res.status(400).json({ 
          error: 'Only users with Inspection_Auditors role can be assigned to branches' 
        });
      }

      // Validate branch exists and is active
      const branch = await Branch.findByPk(branch_id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      if (!branch.is_active) {
        return res.status(400).json({ error: 'Cannot assign to inactive branch' });
      }

      // Check if inspector can be assigned to this branch
      const canAssign = await InspectorBranchAssignment.canAssignInspectorToBranch(inspector_id, branch_id);
      if (!canAssign) {
        return res.status(400).json({ 
          error: 'Inspector is already assigned to this branch' 
        });
      }
       
      

      // Create the assignment
      const assignment = await InspectorBranchAssignment.createAssignment({
        inspector_id,
        branch_id,
        assigned_by_id: currentUser.id,
        start_date: start_date || new Date(),
        end_date: end_date || null
      });

      // Fetch the created assignment with details
      const assignmentWithDetails = await InspectorBranchAssignment.findByPk(assignment.assignment_id, {
        include: [
          {
            model: User,
            as: 'inspector',
            attributes: ['id', 'username', 'email', 'role', 'department']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name']
          },
          {
            model: User,
            as: 'assignedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ]
      });

      res.status(201).json({
        message: 'Inspector branch assignment created successfully',
        assignment: assignmentWithDetails
      });

    } catch (error) {
      console.error('Error creating inspector assignment:', error);
      res.status(500).json({ error: 'Error creating inspector assignment' });
    }
  }

  /**
   * Update inspector branch assignment
   */
  async updateAssignment(req, res) {
    try {
      const currentUser = req.user;
      const { assignmentId } = req.params;
      
      // Check if user has permission to update assignments
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role)) {
        return res.status(403).json({ 
          error: 'Only Inspection supervisors and directors can update inspector assignments' 
        });
      }

      const assignment = await InspectorBranchAssignment.findByPk(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const { start_date, end_date, is_active } = req.body;

      // Update fields if provided
      if (start_date !== undefined) assignment.start_date = start_date;
      if (end_date !== undefined) assignment.end_date = end_date;
      if (is_active !== undefined) assignment.is_active = is_active;

      await assignment.save();

      // Fetch updated assignment with details
      const updatedAssignment = await InspectorBranchAssignment.findByPk(assignmentId, {
        include: [
          {
            model: User,
            as: 'inspector',
            attributes: ['id', 'username', 'email', 'role', 'department']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name']
          },
          {
            model: User,
            as: 'assignedBy',
            attributes: ['id', 'username', 'email', 'role']
          }
        ]
      });

      res.json({
        message: 'Inspector branch assignment updated successfully',
        assignment: updatedAssignment
      });

    } catch (error) {
      console.error('Error updating inspector assignment:', error);
      res.status(500).json({ error: 'Error updating inspector assignment' });
    }
  }

  /**
   * Deactivate inspector branch assignment
   */
  async deactivateAssignment(req, res) {
    try {
      const currentUser = req.user;
      const { assignmentId } = req.params;
      
      // Check if user has permission to deactivate assignments
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role)) {
        return res.status(403).json({ 
          error: 'Only Inspection supervisors and directors can deactivate inspector assignments' 
        });
      }

      const assignment = await InspectorBranchAssignment.findByPk(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      await assignment.deactivate();

      res.json({
        message: 'Inspector branch assignment deactivated successfully'
      });

    } catch (error) {
      console.error('Error deactivating inspector assignment:', error);
      res.status(500).json({ error: 'Error deactivating inspector assignment' });
    }
  }

  /**
   * Get available inspectors for assignment
   */
  async getAvailableInspectors(req, res) {
    try {
      const currentUser = req.user;
      
      // Check if user has permission
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role)) {
        return res.status(403).json({ 
          error: 'Only Inspection supervisors and directors can view available inspectors' 
        });
      }

      // Get all active Inspection_Auditors
      const inspectors = await User.findAll({
        where: {
          role: 'Inspection_Auditors',
          is_active: 'Active'
        },
        attributes: ['id', 'username', 'email', 'department'],
        order: [['username', 'ASC']]
      });

      res.json({ inspectors });

    } catch (error) {
      console.error('Error fetching available inspectors:', error);
      res.status(500).json({ error: 'Error fetching available inspectors' });
    }
  }

  /**
   * Get available branches for assignment
   */
  async getAvailableBranches(req, res) {
    try {
      const currentUser = req.user;

      // Check if user has permission
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          error: 'Only inspection supervisors/directors can view available branches'
        });
      }

      // Get all active branches
      const branches = await Branch.findAll({
        where: { is_active: true },
        attributes: ['id', 'branch_code', 'branch_name', 'is_active'],
        order: [['branch_name', 'ASC']]
      });

      res.json({
        branches,
        total_count: branches.length
      });

    } catch (error) {
      console.error('Error fetching available branches:', error);
      res.status(500).json({ error: 'Error fetching available branches' });
    }
  }

  /**
   * Get assignments for a specific inspector
   */
  async getInspectorAssignments(req, res) {
    try {
      const { inspectorId } = req.params;
      const currentUser = req.user;

      // Check if user has permission or is viewing their own assignments
      const authorizedRoles = ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Admin'];
      if (!authorizedRoles.includes(currentUser.role) && currentUser.id !== inspectorId) {
        return res.status(403).json({ 
          error: 'You can only view your own assignments' 
        });
      }

      const assignments = await InspectorBranchAssignment.getActiveAssignmentsForInspector(inspectorId);

      res.json({ assignments });

    } catch (error) {
      console.error('Error fetching inspector assignments:', error);
      res.status(500).json({ error: 'Error fetching inspector assignments' });
    }
  }
}

module.exports = new InspectorBranchAssignmentController();
