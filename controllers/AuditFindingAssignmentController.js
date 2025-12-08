const { AuditFinding, User, AuditFindingAssigned, AssignedNotification } = require('../models');
const { Op } = require('sequelize');

class AuditFindingAssignmentController {
  /**
   * Assign an audit finding to a responsible person
   */
  async assignFinding(req, res) {
    try {
      const { finding_id, assigned_to_id } = req.body;
      const currentUser = req.user;

      // Validate required fields
      if (!finding_id || !assigned_to_id) {
        return res.status(400).json({ error: 'Finding ID and assignee ID are required' });
      }

      // Find the audit finding
      const auditFinding = await AuditFinding.findByPk(finding_id, {
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'username', 'department', 'role']
          }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit finding not found' });
      }

      // Find the user to assign to
      const assigneeUser = await User.findByPk(assigned_to_id);
      if (!assigneeUser) {
        return res.status(404).json({ error: 'Assignee user not found' });
      }

      // Validate department match with special rules for Inspection department
      const creatorDepartment = auditFinding.createdBy.department;
      const assigneeDepartment = assigneeUser.department;

      if (creatorDepartment === 'Inspection') {
        // Inspection department can assign to Business and Inspection departments
        const allowedDepartments = ['Business', 'Inspection'];
        if (!allowedDepartments.includes(assigneeDepartment)) {
          return res.status(400).json({
            error: 'Inspection department can only assign to Business or Inspection department users'
          });
        }
      } else {
        // All other departments: assignee must be from same department as creator
        if (creatorDepartment !== assigneeDepartment) {
          return res.status(400).json({
            error: 'Assignee must be from the same department as the audit finding creator'
          });
        }
      }

      // Validate assignee role
      const allowedRoles = ['Auditees', 'IT_Auditees', 'Inspection_Auditees', 'Auditee_Supervisor'];
      if (!allowedRoles.includes(assigneeUser.role)) {
        return res.status(400).json({ 
          error: 'Assignee must have one of these roles: Auditees, IT_Auditees, or Inspection_Auditees' 
        });
      }

      // Check if assignment already exists
      const existingAssignment = await AuditFindingAssigned.findOne({
        where: {
          finding_id,
          assigned_to_id
        }
      });

      if (existingAssignment) {
        return res.status(400).json({ 
          error: 'This user is already assigned to this finding' 
        });
      }

      // Create the assignment with the current user as the assigner
      const assignment = await AuditFindingAssigned.create({
        finding_id,
        assigned_to_id,
        assigned_by_id: currentUser.id // Add the current user as the assigner
      });

      // Create notification for the assignee
      await AssignedNotification.create({
        audit_finding_id: finding_id,
        user_id: assigned_to_id,
        message: `You have been assigned to audit finding "${auditFinding.title}" by ${currentUser.username}`
      });

      // Return the assignment with user details
      const assignmentWithDetails = await AuditFindingAssigned.findByPk(assignment.assigned_id, {
        include: [
          {
            model: User,
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'department', 'role']
          },
          {
            model: User,
            as: 'assignedByUser',
            attributes: ['id', 'username', 'email', 'department', 'role']
          },
          {
            model: AuditFinding,
            as: 'auditFinding',
            attributes: ['id', 'title', 'status']
          }
        ]
      });

      res.status(201).json(assignmentWithDetails);
    } catch (error) {
      console.error('Error assigning audit finding:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove an assignment - only the creator of the finding can remove assignments
   */
  async removeAssignment(req, res) {
    try {
      const { assigned_id } = req.params;
      const currentUser = req.user;

      // Find the assignment with related finding
      const assignment = await AuditFindingAssigned.findByPk(assigned_id, {
        include: [
          {
            model: AuditFinding,
            as: 'auditFinding',
            include: [
              {
                model: User,
                as: 'createdBy',
                attributes: ['id']
              }
            ]
          }
        ]
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Check if current user is the creator of the finding
      if (assignment.auditFinding.createdBy.id !== currentUser.id) {
        return res.status(403).json({ 
          error: 'Only the creator of the audit finding can remove assignments' 
        });
      }

      await assignment.destroy();
      res.status(200).json({ message: 'Assignment removed successfully' });
    } catch (error) {
      console.error('Error removing assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all assignments for a finding
   */
  async getAssignmentsByFinding(req, res) {
    try {
      const { finding_id } = req.params;

      const assignments = await AuditFindingAssigned.findAll({
        where: { finding_id },
        include: [
          {
            model: User,
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'department', 'role']
          }
        ]
      });

      res.status(200).json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all assignments with pagination and filters
   */
  async getAllAssignments(req, res) {
    try {
      const { page = 1, limit = 10, search = '', status = '', assigned_to_id = '' } = req.query;
      const offset = (page - 1) * limit;

      // Build where clause for filtering
      const whereClause = {};
      if (assigned_to_id) {
        whereClause.assigned_to_id = assigned_to_id;
      }

      // Build include clause for audit finding filtering
      const auditFindingWhere = {};
      if (status) {
        auditFindingWhere.status = status;
      }
      if (search) {
        auditFindingWhere[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const assignments = await AuditFindingAssigned.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'department', 'role']
          },
          {
            model: User,
            as: 'assignedByUser',
            attributes: ['id', 'username', 'email', 'department', 'role']
          },
          {
            model: AuditFinding,
            as: 'auditFinding',
            where: Object.keys(auditFindingWhere).length > 0 ? auditFindingWhere : undefined,
            attributes: ['id', 'title', 'description', 'status', 'amount', 'created_at'],
            required: true
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.status(200).json({
        data: assignments.rows,
        total: assignments.count,
        page: parseInt(page),
        totalPages: Math.ceil(assignments.count / limit),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error fetching all assignments:', error);
      // Return empty result instead of error to prevent frontend crash
      res.status(200).json({
        data: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: parseInt(req.query.limit || 10)
      });
    }
  }

  /**
   * Get all findings assigned to the logged-in user
   */
  async getMyAssignedFindings(req, res) {
    try {
      const currentUser = req.user;
      
      // Find all assignments for the current user
      const assignments = await AuditFindingAssigned.findAll({
        where: { assigned_to_id: currentUser.id },
        include: [
          {
            model: AuditFinding,
            as: 'auditFinding',
            include: [
              {
                model: User,
                as: 'createdBy',
                attributes: ['id', 'username', 'email', 'department', 'role']
              }
            ]
          }
        ]
      });

      // Extract the findings from the assignments
      const assignedFindings = assignments.map(assignment => {
        const finding = assignment.auditFinding;
        return {
          ...finding.toJSON(),
          assigned_id: assignment.assigned_id,
          assigned_at: assignment.assigned_at
        };
      });

      res.status(200).json(assignedFindings);
    } catch (error) {
      console.error('Error fetching assigned findings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuditFindingAssignmentController();

