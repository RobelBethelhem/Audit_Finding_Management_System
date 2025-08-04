const { AuditFinding, Branch, User, AuditFindingAssigned, AssignedNotification } = require('../models');
const { Op } = require('sequelize');

class BranchAssignmentController {
  /**
   * Assign an audit finding to a branch (with role-based logic)
   */
  async assignToBranch(req, res) {
    try {
      const { finding_id, branch_id } = req.body;
      const currentUser = req.user;

      console.log('Branch assignment request:', { finding_id, branch_id, user: currentUser.username });

      // Validate required fields
      if (!finding_id) {
        return res.status(400).json({ error: 'Finding ID is required' });
      }

      // Find the audit finding
      const auditFinding = await AuditFinding.findByPk(finding_id, {
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'username', 'department', 'role', 'branch_id']
          }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit finding not found' });
      }

      // Check if already assigned using existing logic
      const existingAssignment = await AuditFindingAssigned.findOne({
        where: { audit_finding_id: finding_id }
      });

      if (existingAssignment) {
        return res.status(400).json({ 
          error: 'This audit finding is already assigned to a user' 
        });
      }

      let targetBranchId = branch_id;

      // Role-based branch assignment logic
      const userRole = currentUser.role;
      const auditingRoles = [
        'Admin', 'Resident_Auditors', 'Audit_Supervisor', 'Audit_Director',
        'IT_Auditors', 'IT_Auditors_Supervisor', 'IT_Auditors_Director',
        'Inspection_Auditors', 'Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'
      ];

      if (!auditingRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Only auditing roles can assign findings to branches' 
        });
      }

      // If no branch_id provided, use role-based logic to determine target branch
      if (!targetBranchId) {
        // For inspection roles, assign to creator's branch if they have one
        if (userRole.includes('Inspection') && currentUser.branch_id) {
          targetBranchId = currentUser.branch_id;
        } else {
          return res.status(400).json({ 
            error: 'Branch ID is required for this assignment' 
          });
        }
      }

      // Find the target branch
      const branch = await Branch.findByPk(targetBranchId);
      if (!branch || !branch.is_active) {
        return res.status(404).json({ error: 'Branch not found or inactive' });
      }

      // Find branch supervisor (user with supervisor role in the branch)
      const supervisorRoles = [
        'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor'
      ];

      const branchSupervisor = await User.findOne({
        where: {
          branch_id: targetBranchId,
          role: { [Op.in]: supervisorRoles },
          is_active: 'Active'
        }
      });

      if (!branchSupervisor) {
        return res.status(400).json({
          error: `No active supervisor found in the selected branch`
        });
      }

      // Try to import and use the normalized table model
      let AuditFindingBranchAssignment;
      try {
        const models = require('../models');
        AuditFindingBranchAssignment = models.AuditFindingBranchAssignment;
      } catch (error) {
        console.error('Error importing AuditFindingBranchAssignment model:', error);
      }

      // Create branch assignment record if model is available
      let branchAssignment = null;
      if (AuditFindingBranchAssignment) {
        try {
          branchAssignment = await AuditFindingBranchAssignment.create({
            audit_finding_id: finding_id,
            assigned_branch_id: targetBranchId,
            branch_assigned_by_id: currentUser.id,
            branch_supervisor_id: branchSupervisor.id
          });
          console.log('Branch assignment record created:', branchAssignment.assignment_id);
        } catch (error) {
          console.error('Error creating branch assignment record:', error);
          // Continue without the normalized record for now
        }
      }

      // Create notification for branch supervisor
      try {
        await AssignedNotification.create({
          user_id: branchSupervisor.id,
          message: `Audit finding "${auditFinding.title}" has been assigned to your branch (${branch.branch_name}) by ${currentUser.username}. Please assign it to a team member.`
        });
        console.log('Notification created for supervisor:', branchSupervisor.username);
      } catch (error) {
        console.error('Error creating notification:', error);
        // Continue without notification
      }

      // Return success response
      res.json({
        message: 'Audit finding successfully assigned to branch',
        assignment: {
          finding: {
            id: auditFinding.id,
            title: auditFinding.title
          },
          branch: {
            id: branch.id,
            name: branch.branch_name,
            code: branch.branch_code
          },
          supervisor: {
            id: branchSupervisor.id,
            username: branchSupervisor.username
          },
          assigned_by: {
            id: currentUser.id,
            username: currentUser.username
          },
          assigned_at: new Date(),
          assignment_id: branchAssignment ? branchAssignment.assignment_id : null
        }
      });

    } catch (error) {
      console.error('Error assigning finding to branch:', error);
      res.status(500).json({ error: 'Error assigning finding to branch' });
    }
  }








  

  /**
   * Assign finding from branch to specific user (for branch supervisors)
   */
  async assignToUser(req, res) {
    try {
      const { finding_id, assigned_to_id } = req.body;
      const currentUser = req.user;

      console.log('User assignment request:', { finding_id, assigned_to_id, user: currentUser.username });

      // Validate required fields
      if (!finding_id || !assigned_to_id) {
        return res.status(400).json({ error: 'Finding ID and assignee ID are required' });
      }

      // Find the audit finding
      const auditFinding = await AuditFinding.findByPk(finding_id);
      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit finding not found' });
      }

      // Check if user is supervisor in the same branch as assignee
      const assigneeUser = await User.findByPk(assigned_to_id);
      if (!assigneeUser || assigneeUser.is_active !== 'Active') {
        return res.status(404).json({ error: 'Assignee user not found or inactive' });
      }

      // Check if current user can assign (supervisor in same branch or admin)
      const supervisorRoles = [
        'Admin', 'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor'
      ];

      const canAssign = supervisorRoles.includes(currentUser.role) && 
                       (currentUser.role === 'Admin' || currentUser.branch_id === assigneeUser.branch_id);

      if (!canAssign) {
        return res.status(403).json({ 
          error: 'You can only assign findings to users in your supervised branch' 
        });
      }

      // Check if already assigned to a user
      const existingAssignment = await AuditFindingAssigned.findOne({
        where: { audit_finding_id: finding_id }
      });

      if (existingAssignment) {
        return res.status(400).json({ 
          error: 'This audit finding is already assigned to a user' 
        });
      }

      // Create user assignment
      const userAssignment = await AuditFindingAssigned.create({
        audit_finding_id: finding_id,
        assigned_to_id: assigned_to_id,
        assigned_by_id: currentUser.id,
        assigned_at: new Date()
      });

      // Create notification for assignee
      try {
        await AssignedNotification.create({
          user_id: assigned_to_id,
          message: `Audit finding "${auditFinding.title}" has been assigned to you by ${currentUser.username}.`
        });
        console.log('Notification created for assignee:', assigneeUser.username);
      } catch (error) {
        console.error('Error creating notification:', error);
      }

      res.json({
        message: 'Audit finding successfully assigned to user',
        assignment: {
          id: userAssignment.id,
          finding: {
            id: auditFinding.id,
            title: auditFinding.title
          },
          assignee: {
            id: assigneeUser.id,
            username: assigneeUser.username,
            email: assigneeUser.email
          },
          assigned_by: {
            id: currentUser.id,
            username: currentUser.username
          },
          assigned_at: userAssignment.assigned_at
        }
      });

    } catch (error) {
      console.error('Error assigning user to finding:', error);
      res.status(500).json({ error: 'Error assigning user to finding' });
    }
  }

  /**
   * Get available branches for assignment (role-based)
   */
  async getAvailableBranches(req, res) {
    try {
      const currentUser = req.user;
      const userRole = currentUser.role;

      console.log('Get available branches request:', { user: currentUser.username, role: userRole });

      // Define which roles can assign to which branches
      const auditingRoles = [
        'Admin', 'Resident_Auditors', 'Audit_Supervisor', 'Audit_Director',
        'IT_Auditors', 'IT_Auditors_Supervisor', 'IT_Auditors_Director',
        'Inspection_Auditors', 'Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'
      ];

      if (!auditingRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Only auditing roles can view available branches' 
        });
      }

      // Get all active branches
      const branches = await Branch.findAll({
        where: { is_active: true },
        attributes: ['id', 'branch_code', 'branch_name'],
        order: [['branch_name', 'ASC']]
      });

      res.json({ 
        branches,
        userRole: userRole,
        canAssignToAnyBranch: true,
        total_count: branches.length
      });

    } catch (error) {
      console.error('Error fetching available branches:', error);
      res.status(500).json({ error: 'Error fetching available branches' });
    }
  }

  /**
   * Get assignable users in branch (for branch supervisors)
   */
  async getAssignableUsersInBranch(req, res) {
    try {
      const { branch_id } = req.params;
      const currentUser = req.user;

      console.log('Get assignable users request:', { branch_id, user: currentUser.username });

      if (!branch_id) {
        return res.status(400).json({ error: 'Branch ID is required' });
      }

      // Check if user can view users in this branch
      const supervisorRoles = [
        'Admin', 'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor'
      ];

      const canViewBranch = supervisorRoles.includes(currentUser.role) && 
                           (currentUser.role === 'Admin' || currentUser.branch_id === branch_id);

      if (!canViewBranch) {
        return res.status(403).json({ 
          error: 'You can only view users in your supervised branch' 
        });
      }

      // Get assignable users in the branch
      const assignableRoles = [
        'Auditees', 'IT_Auditees', 'Inspection_Auditees'
      ];

      const users = await User.findAll({
        where: {
          branch_id: branch_id,
          role: { [Op.in]: assignableRoles },
          is_active: 'Active'
        },
        attributes: ['id', 'username', 'email', 'role', 'department'],
        order: [['username', 'ASC']]
      });

      res.json({ 
        users,
        branch_id,
        total_count: users.length
      });

    } catch (error) {
      console.error('Error fetching assignable users:', error);
      res.status(500).json({ error: 'Error fetching assignable users' });
    }
  }
}

module.exports = new BranchAssignmentController();
