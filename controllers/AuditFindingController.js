const BaseController = require('./BaseController');
const { AuditFinding, User, AuditFindingAssigned, AuditFindingEscalation, AuditAmendmentHistory, AssignedNotification, EscalationNotification, AuditFindingRectification, ActionPlan, Category, RiskLevel, RiskRating, AuditRectificationEvidence, AuditRectificationAmendmentHistory } = require('../models');
const UserService = require('../services/userService');
const { Op } = require('sequelize');

class AuditFindingController extends BaseController {
  constructor() {
    super(AuditFinding);
  }

  // Common authorization helper for update and delete
  async authorizeFindingModification(req, res, next) {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const auditFinding = await AuditFinding.findByPk(id, {
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'role', 'department']
          }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found.' });
      }

      const creatorUser = auditFinding.createdBy;

      if (!creatorUser) {
        return res.status(500).json({ error: 'Creator information missing for this Audit Finding. Internal error.' });
      }

      const currentRole = currentUser.role;
      const currentDepartment = currentUser.department;
      const creatorRole = creatorUser.role;
      const creatorDepartment = creatorUser.department;

      let isAuthorized = false;

      // Rule 1: A user can modify their own created findings
      if (currentUser.id === creatorUser.id) {
          isAuthorized = true;
      }

      // Rule 2: Supervisor/Director roles can modify findings created by specific auditor roles within their department
      if (!isAuthorized) {
          switch (creatorRole) {
              case 'Resident_Auditors':
                  if (creatorDepartment === 'Business' && currentDepartment === 'Business' &&
                      ['Audit_Supervisor', 'Audit_Director'].includes(currentRole)) {
                      isAuthorized = true;
                  }
                  break;
              case 'IT_Auditors':
                  if (creatorDepartment === 'IT_Audit' && currentDepartment === 'IT_Audit' &&
                      ['IT_Auditors_Supervisor', 'IT_Auditors_Director'].includes(currentRole)) {
                      isAuthorized = true;
                  }
                  break;
              case 'Inspection_Auditors':
                  if (creatorDepartment === 'Inspection' && currentDepartment === 'Inspection' &&
                      ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'].includes(currentRole)) {
                      isAuthorized = true;
                  }
                  break;
              // Rule 3: Admin can modify any finding
              case 'Admin':
                  if (currentRole === 'Admin') {
                      isAuthorized = true;
                  }
                  break;
              default:
                  break;
          }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized to perform this action on this Audit Finding.' });
      }

      req.auditFinding = auditFinding;
      req.creatorUser = creatorUser;
      next();

    } catch (error) {
      console.error('Error in authorizeFindingModification:', error);
      res.status(500).json({ error: 'Internal server error during authorization.' });
    }
  }

  async create(req, res) {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const allowedCreatorRoles = {
      'Resident_Auditors': 'Business',
      'IT_Auditors': 'IT_Audit',
      'Inspection_Auditors': 'Inspection'
    };

    const isRoleAllowed = Object.keys(allowedCreatorRoles).includes(currentUser.role);
    const isDepartmentMatch = allowedCreatorRoles[currentUser.role] === currentUser.department;

    if (!isRoleAllowed || !isDepartmentMatch) {
      return res.status(403).json({ error: 'Unauthorized role or department to create Audit Findings.' });
    }

    try {
      const {
        title, description, criteria, cause, impact, recommendation,
        amount, risk_level_id, category_id, risk_rating_id, status,
        initial_assigned_to_id
      } = req.body;

      if (!title || !description || !criteria || !cause || !impact || !recommendation ||
          !amount || !risk_level_id || !category_id || !risk_rating_id) {
        return res.status(400).json({ error: 'All essential fields are required to create an Audit Finding.' });
      }

      const auditFinding = await AuditFinding.create({
        title,
        description,
        criteria,
        cause,
        impact,
        recommendation,
        amount,
        risk_level_id,
        category_id,
        risk_rating_id,
        status: status || 'Pending',
        created_by_id: currentUser.id
      });

      await AuditFindingAssigned.create({
        finding_id: auditFinding.id,
        assigned_to_id: initial_assigned_to_id || currentUser.id,
      });

      res.status(201).json(auditFinding);

    } catch (error) {
      console.error('Error creating Audit Finding:', error);
      res.status(500).json({ error: 'Error creating Audit Finding.' });
    }
  }

  async update(req, res) {
    const auditFinding = req.auditFinding;
    const currentUser = req.user;

    try {
      await auditFinding.update(req.body);

      await AuditAmendmentHistory.create({
        amend_by_id: currentUser.id,
        audit_finding_id: auditFinding.id,
        title: auditFinding.title,
        description: auditFinding.description,
        criteria: auditFinding.criteria,
        cause: auditFinding.cause,
        impact: auditFinding.impact,
        recommendation: auditFinding.recommendation,
        amount: auditFinding.amount,
        risk_level_id: auditFinding.risk_level_id,
        category_id: auditFinding.category_id,
        risk_rating_id: auditFinding.risk_rating_id,
        created_by_id: auditFinding.created_by_id,
        status: auditFinding.status,
        rectification_id: auditFinding.rectification_id,
      });

      res.json(auditFinding);

    } catch (error) {
      console.error('Error updating Audit Finding or creating amendment history:', error);
      res.status(500).json({ error: 'Error updating Audit Finding.' });
    }
  }

  async delete(req, res) {
    const auditFinding = req.auditFinding;

    try {
      await auditFinding.destroy();
      res.json({ message: 'Audit Finding deleted successfully.' });

    } catch (error) {
      console.error('Error deleting Audit Finding:', error);
      res.status(500).json({ error: 'Error deleting Audit Finding.' });
    }
  }

  // Modified method to initiate rectification
  async initiateRectification(req, res) {
    const { id } = req.params; // AuditFinding ID
    const { rectification_description, rectification_evidences } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!rectification_description) {
      return res.status(400).json({ error: 'Rectification description is required.' });
    }

    try {
      const auditFinding = await AuditFinding.findByPk(id, {
        include: [
          {
            model: AuditFindingAssigned,
            as: 'AuditFindingAssigneds',
            where: { assigned_to_id: currentUser.id }, // Check if current user is assigned
            required: false, // Make this false to conditionally check below
          },
          {
            model: AuditFindingEscalation, // Include escalations to check if it's escalated to current user
            as: 'AuditFindingEscalations',
            where: { escalated_to_id: currentUser.id },
            required: false,
          }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found.' });
      }

      // Check if the current user is explicitly assigned OR if it's escalated to them
      const isAssigned = auditFinding.AuditFindingAssigneds && auditFinding.AuditFindingAssigneds.length > 0;
      const isEscalatedToCurrentUser = auditFinding.AuditFindingEscalations && auditFinding.AuditFindingEscalations.some(
        esc => esc.escalated_to_id === currentUser.id
      );

      const supervisorRoles = [
        'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor',
      ];

      let isAuthorizedToRectify = false;

      // If current user is a regular assigned user, they can rectify
      if (isAssigned && !supervisorRoles.includes(currentUser.role)) {
          isAuthorizedToRectify = true;
      }
      // If current user is a supervisor role, they can rectify ONLY IF it's escalated to them
      else if (supervisorRoles.includes(currentUser.role) && isEscalatedToCurrentUser) {
          isAuthorizedToRectify = true;
      }
      // Admin can always rectify
      else if (currentUser.role === 'Admin') {
          isAuthorizedToRectify = true;
      }


      if (!isAuthorizedToRectify) {
        return res.status(403).json({ error: 'You are not authorized to initiate rectification for this Audit Finding.' });
      }

      // Check if the finding is already resolved or under rectification
      if (auditFinding.status === 'Resolved' || auditFinding.status === 'Under_Rectification') {
        return res.status(400).json({ error: `Audit Finding is already ${auditFinding.status}.` });
      }

      // Create the rectification record
      const rectification = await AuditFindingRectification.create({
        submitted_by_id: currentUser.id,
        audit_finding_id: auditFinding.id,
        rectification: rectification_description,
        status: 'Pending'
      });

      // Handle rectification evidences if provided
      if (rectification_evidences && Array.isArray(rectification_evidences) && rectification_evidences.length > 0) {
        const evidenceRecords = rectification_evidences.map(evidence => ({
          rectification_id: rectification.id,
          rectification_evidence_url: evidence.rectification_evidence_url,
          rectification_file_name: evidence.file_name,
          rectification_file_type: evidence.file_type
        }));
        await AuditRectificationEvidence.bulkCreate(evidenceRecords);
      }

      // Update the AuditFinding status
      auditFinding.status = 'Under_Rectification';
      auditFinding.rectification_id = rectification.id;
      await auditFinding.save();

      // Log the amendment history for the Audit Finding status change
      await AuditAmendmentHistory.create({
        amend_by_id: currentUser.id,
        audit_finding_id: auditFinding.id,
        title: auditFinding.title,
        description: auditFinding.description,
        criteria: auditFinding.criteria,
        cause: auditFinding.cause,
        impact: auditFinding.impact,
        recommendation: auditFinding.recommendation,
        amount: auditFinding.amount,
        risk_level_id: auditFinding.risk_level_id,
        category_id: auditFinding.category_id,
        risk_rating_id: auditFinding.risk_rating_id,
        created_by_id: auditFinding.created_by_id,
        status: auditFinding.status,
        rectification_id: auditFinding.rectification_id,
      });

      // Log the initial submission of the Rectification to AuditRectificationAmendmentHistory
      await AuditRectificationAmendmentHistory.create({
        amend_by_id: currentUser.id,
        rectification_id: rectification.id,
        rectification: rectification.rectification,
        status: rectification.status,
      });

      res.status(200).json({
        message: 'Rectification submitted successfully and Audit Finding status updated.',
        auditFinding,
        rectification
      });

    } catch (error) {
      console.error('Error initiating rectification:', error);
      res.status(500).json({ error: 'Error initiating rectification.' });
    }
  }

  // Authorization middleware for rectification approval/rejection
  async authorizeRectificationApproval(req, res, next) {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const auditFinding = await AuditFinding.findByPk(id, {
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'role', 'department']
          },
          {
            model: AuditFindingRectification,
            as: 'AuditFindingRectification',
            where: { status: 'Pending' }, // Only allow approval/rejection for pending rectifications
            required: true,
          }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found or no pending rectification for it.' });
      }

      const creatorUser = auditFinding.createdBy;
      const currentRole = currentUser.role;
      const currentDepartment = currentUser.department;
      const creatorRole = creatorUser.role;
      const creatorDepartment = creatorUser.department;

      let isAuthorized = false;

      // Rule 1: The original creator of the Audit Finding can approve/reject
      if (currentUser.id === creatorUser.id) {
          isAuthorized = true;
      }

      // Rule 2: Supervisor/Director roles can approve/reject findings created by specific auditor roles within their department
      if (!isAuthorized) {
          switch (creatorRole) {
              case 'Resident_Auditors':
                  if (creatorDepartment === 'Business' && currentDepartment === 'Business' &&
                      ['Audit_Supervisor', 'Audit_Director'].includes(currentRole)) {
                      isAuthorized = true;
                  }
                  break;
              case 'IT_Auditors':
                  if (creatorDepartment === 'IT_Audit' && currentDepartment === 'IT_Audit' &&
                      ['IT_Auditors_Supervisor', 'IT_Auditors_Director'].includes(currentRole)) {
                      isAuthorized = true;
                  }
                  break;
              case 'Inspection_Auditors':
                  if (creatorDepartment === 'Inspection' && currentDepartment === 'Inspection' &&
                      ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'].includes(currentRole)) {
                      isAuthorized = true;
                  }
                  break;
              case 'Admin':
                  if (currentRole === 'Admin') {
                      isAuthorized = true;
                  }
                  break;
              default:
                  break;
          }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized to approve/reject this rectification.' });
      }

      req.auditFinding = auditFinding;
      req.pendingRectification = auditFinding.AuditFindingRectification;
      next();

    } catch (error) {
      console.error('Error in authorizeRectificationApproval:', error);
      res.status(500).json({ error: 'Internal server error during rectification authorization.' });
    }
  }

  // New Authorization middleware for updating/amending a rectification (after rejection)
  async authorizeRectificationUpdate(req, res, next) {
    const { id } = req.params; // AuditFinding ID
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      // Find the audit finding and its associated rectification that is 'Rejected'
      const auditFinding = await AuditFinding.findByPk(id, {
        include: [
          {
            model: AuditFindingRectification,
            as: 'AuditFindingRectification', // Use the correct alias from index.js
            where: { status: 'Rejected' }, // Only allow update if status is Rejected
            required: true,
          }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found or no rejected rectification for it.' });
      }

      const rejectedRectification = auditFinding.AuditFindingRectification;

      // Only the original submitter of the rectification can update it
      if (currentUser.id !== rejectedRectification.submitted_by_id && currentUser.role !== 'Admin') {
        return res.status(403).json({ error: 'Unauthorized to amend this rectification. Only the original submitter or an Admin can amend rejected rectifications.' });
      }

      req.auditFinding = auditFinding;
      req.rejectedRectification = rejectedRectification; // Pass the rejected rectification record
      next();

    } catch (error) {
      console.error('Error in authorizeRectificationUpdate:', error);
      res.status(500).json({ error: 'Internal server error during rectification update authorization.' });
    }
  }

  // Method to approve rectification
  async approveRectification(req, res) {
    const auditFinding = req.auditFinding;
    const pendingRectification = req.pendingRectification;
    const currentUser = req.user;

    try {
      pendingRectification.status = 'Approved';
      await pendingRectification.save();

      auditFinding.status = 'Resolved';
      await auditFinding.save();

      await AuditAmendmentHistory.create({
        amend_by_id: currentUser.id,
        audit_finding_id: auditFinding.id,
        title: auditFinding.title,
        description: auditFinding.description,
        criteria: auditFinding.criteria,
        cause: auditFinding.cause,
        impact: auditFinding.impact,
        recommendation: auditFinding.recommendation,
        amount: auditFinding.amount,
        risk_level_id: auditFinding.risk_level_id,
        category_id: auditFinding.category_id,
        risk_rating_id: auditFinding.risk_rating_id,
        created_by_id: auditFinding.created_by_id,
        status: auditFinding.status,
        rectification_id: auditFinding.rectification_id,
      });

      await AuditRectificationAmendmentHistory.create({
        amend_by_id: currentUser.id,
        rectification_id: pendingRectification.id,
        rectification: pendingRectification.rectification,
        status: pendingRectification.status,
      });

      res.status(200).json({
        message: 'Rectification approved and Audit Finding status changed to Resolved.',
        auditFinding,
        rectification: pendingRectification
      });

    } catch (error) {
      console.error('Error approving rectification:', error);
      res.status(500).json({ error: 'Error approving rectification.' });
    }
  }

  // Modified method to reject rectification
  async rejectRectification(req, res) {
    const auditFinding = req.auditFinding;
    const pendingRectification = req.pendingRectification;
    const currentUser = req.user;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a rectification.' });
    }

    try {
      pendingRectification.status = 'Rejected';
      pendingRectification.reason = rejection_reason; // Save the rejection reason
      await pendingRectification.save();

      // Optionally, change Audit Finding status back to 'In_Progress' or a specific 'Rejected' status
      // Keeping it 'Under_Rectification' might be better until a new one is submitted,
      // or change to 'In_Progress' if you want it to be actively worked on again.
      // For now, I'll revert to 'In_Progress' as it implies further action needed.
      auditFinding.status = 'In_Progress';
      // auditFinding.rectification_id = null; // Don't nullify, keep link to rejected rectification for history
      await auditFinding.save();

      await AuditAmendmentHistory.create({
        amend_by_id: currentUser.id,
        audit_finding_id: auditFinding.id,
        title: auditFinding.title,
        description: auditFinding.description,
        criteria: auditFinding.criteria,
        cause: auditFinding.cause,
        impact: auditFinding.impact,
        recommendation: auditFinding.recommendation,
        amount: auditFinding.amount,
        risk_level_id: auditFinding.risk_level_id,
        category_id: auditFinding.category_id,
        risk_rating_id: auditFinding.risk_rating_id,
        created_by_id: auditFinding.created_by_id,
        status: auditFinding.status,
        rectification_id: auditFinding.rectification_id,
      });

      await AuditRectificationAmendmentHistory.create({
        amend_by_id: currentUser.id,
        rectification_id: pendingRectification.id,
        rectification: pendingRectification.rectification,
        status: pendingRectification.status, // 'Rejected'
        // If AuditRectificationAmendmentHistory had a 'reason' field, you'd add it here too.
        // Assuming it only tracks status and rectification text for now.
      });

      res.status(200).json({
        message: 'Rectification rejected and Audit Finding status changed.',
        auditFinding,
        rectification: pendingRectification,
        rejection_reason
      });

    } catch (error) {
      console.error('Error rejecting rectification:', error);
      res.status(500).json({ error: 'Error rejecting rectification.' });
    }
  }

  // New method to update/amend a rejected rectification
  async updateRectification(req, res) {
    const auditFinding = req.auditFinding;
    const rejectedRectification = req.rejectedRectification; // The rejected rectification record
    const currentUser = req.user;
    const { rectification_description, rectification_evidences } = req.body;

    if (!rectification_description) {
      return res.status(400).json({ error: 'Rectification description is required for amendment.' });
    }

    try {
      // Update the rectification details and status
      rejectedRectification.rectification = rectification_description;
      rejectedRectification.status = 'Amended';
      // Clear any previous rejection reason
      rejectedRectification.reason = null;
      await rejectedRectification.save();

      // Clear existing evidences and add new ones (simple replacement for now)
      await AuditRectificationEvidence.destroy({ where: { rectification_id: rejectedRectification.id } });
      if (rectification_evidences && Array.isArray(rectification_evidences) && rectification_evidences.length > 0) {
        const evidenceRecords = rectification_evidences.map(evidence => ({
          rectification_id: rejectedRectification.id,
          rectification_evidence_url: evidence.rectification_evidence_url,
          rectification_file_name: evidence.file_name, // Assuming file_name is passed
          rectification_file_type: evidence.file_type // Assuming file_type is passed
        }));
        await AuditRectificationEvidence.bulkCreate(evidenceRecords);
      }

      // Change Audit Finding status back to 'Under_Rectification'
      // This prepares it for re-approval
      auditFinding.status = 'Under_Rectification';
      // The rectification_id on auditFinding should already point to this one.
      await auditFinding.save();

      await AuditAmendmentHistory.create({
        amend_by_id: currentUser.id,
        audit_finding_id: auditFinding.id,
        title: auditFinding.title,
        description: auditFinding.description,
        criteria: auditFinding.criteria,
        cause: auditFinding.cause,
        impact: auditFinding.impact,
        recommendation: auditFinding.recommendation,
        amount: auditFinding.amount,
        risk_level_id: auditFinding.risk_level_id,
        category_id: auditFinding.category_id,
        risk_rating_id: auditFinding.risk_rating_id,
        created_by_id: auditFinding.created_by_id,
        status: auditFinding.status, // The new status 'Under_Rectification'
        rectification_id: auditFinding.rectification_id,
      });

      await AuditRectificationAmendmentHistory.create({
        amend_by_id: currentUser.id,
        rectification_id: rejectedRectification.id,
        rectification: rejectedRectification.rectification,
        status: rejectedRectification.status, // 'Amended'
      });

      res.status(200).json({
        message: 'Rectification amended successfully and Audit Finding status updated to Under_Rectification.',
        auditFinding,
        rectification: rejectedRectification
      });

    } catch (error) {
      console.error('Error updating rectification:', error);
      res.status(500).json({ error: 'Error updating rectification.' });
    }
  }

  // Modified findAll from BaseController to include creator/assignment info and apply visibility rules
  async findAll(req, res) {
    try {
      const { page = 1, limit = 10, search, status, category_id, risk_level_id, risk_rating_id } = req.query;
      const offset = (page - 1) * limit;
      const currentUser = req.user; // Authenticated user

      if (!currentUser) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const where = {};
      if (status) where.status = status;
      if (category_id) where.category_id = category_id;
      if (risk_level_id) where.risk_level_id = risk_level_id;
      if (risk_rating_id) where.risk_rating_id = risk_rating_id;

      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const currentUserRole = currentUser.role;
      const currentUserDepartment = currentUser.department;

      const supervisorRoles = [
        'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor',
      ];

      const directorRoles = {
        'Audit_Director': 'Business',
        'IT_Auditors_Director': 'IT_Audit',
        'Inspection_Auditors_Director': 'Inspection'
      };

      const supervisorToDirectorMap = {
        'Audit_Supervisor': 'Audit_Director',
        'IT_Auditors_Supervisor': 'IT_Auditors_Director',
        'Inspection_Auditors_Supervisor': 'Inspection_Auditors_Director',
      };

      let baseWhereConditions = [];

      // Always include findings created by the current user
      baseWhereConditions.push({ created_by_id: currentUser.id });

      // Always include findings assigned to the current user
      baseWhereConditions.push({ '$AuditFindingAssigneds.assigned_to_id$': currentUser.id });

      // If the current user is a specific type of supervisor,
      // they can see findings created by their direct or indirect supervisees within the same department type.
      if (supervisorRoles.includes(currentUserRole)) {
        const descendentIds = await UserService.getDescendentUserIds(currentUser.id);
        descendentIds.push(currentUser.id); // Include the supervisor themselves

        baseWhereConditions.push({
          '$createdBy.id$': { [Op.in]: descendentIds },
          '$createdBy.department$': currentUserDepartment // Must be in the same department
        });
      }

      // NEW: Visibility for Directors based on 'Reviewed' status by Supervisor
      if (Object.keys(directorRoles).includes(currentUserRole) && directorRoles[currentUserRole] === currentUserDepartment) {
        const relevantSupervisorRole = Object.keys(supervisorToDirectorMap).find(
            key => supervisorToDirectorMap[key] === currentUserRole
        );

        if (relevantSupervisorRole) {
            baseWhereConditions.push({
                [Op.and]: [
                    { '$AuditAmendmentHistories.status$': 'Reviewed' },
                    { '$AuditAmendmentHistories.amendedBy.role$': relevantSupervisorRole },
                    { '$AuditAmendmentHistories.amendedBy.department$': currentUserDepartment },
                    // Ensure that the specific finding was created by someone in the same department hierarchy as this director's area
                    { '$createdBy.department$': currentUserDepartment }
                ]
            });
        }
      }

      // If current user is Admin, they can see all findings, so override all conditions
      if (currentUserRole === 'Admin') {
          where[Op.and] = []; // Clear other conditions for Admin
      } else {
          // Combine all valid conditions with OR for non-admin users
          if (baseWhereConditions.length > 0) {
              where[Op.or] = baseWhereConditions;
          } else {
              // If no specific conditions apply, prevent showing anything by default
              where.id = null; // No findings will match, effectively returning empty
          }
      }

      const { count, rows } = await AuditFinding.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
            {
                model: User,
                as: 'createdBy',
                attributes: ['id', 'username', 'email', 'role', 'department'],
                required: true // Required for filtering by createdBy fields
            },
            {
                model: AuditFindingAssigned,
                as: 'AuditFindingAssigneds',
                attributes: ['assigned_to_id', 'created_at'],
                include: [{
                    model: User,
                    as: 'assignedToUser',
                    attributes: ['id', 'username', 'email', 'role', 'department']
                }],
                required: false // Not required for general visibility, only for specific checks
            },
            {
                model: AuditFindingEscalation,
                as: 'AuditFindingEscalations',
                attributes: ['escalated_to_id', 'escalated_by_id', 'created_at', 'escalation_level'],
                required: false
            },
            {
                model: AuditAmendmentHistory,
                as: 'AuditAmendmentHistories',
                attributes: ['status', 'amend_by_id', 'created_at'],
                include: [{
                    model: User,
                    as: 'amendedBy',
                    attributes: ['id', 'username', 'role', 'department']
                }],
                required: false // Not required, only needed for specific visibility rule
            },
            { model: AssignedNotification },
            { model: EscalationNotification },
            { model: AuditFindingRectification },
            { model: ActionPlan },
            { model: Category },
            { model: RiskLevel },
            { model: RiskRating }
        ],
        // Adding `distinct` to prevent duplicate rows if multiple AuditAmendmentHistory records match
        // and `subQuery: false` if needed, depending on exact Sequelize version and complexity.
        distinct: true,
        col: 'id' // Count distinct findings based on their ID
      });

      res.json({
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });

    } catch (error) {
      console.error('Error fetching audit findings:', error);
      res.status(500).json({ error: 'Error fetching audit findings.' });
    }
  }

  // Override findById from BaseController to include creator/assignment info
  async findById(req, res) {
    try {
      const { id } = req.params;
      const auditFinding = await AuditFinding.findByPk(id, {
        include: [
            {
                model: User,
                as: 'createdBy', // Include the creator user
                attributes: ['id', 'username', 'email', 'role', 'department']
            },
            {
                model: AuditFindingAssigned,
                as: 'AuditFindingAssigneds',
                attributes: ['assigned_to_id', 'created_at'], // assigned_by_id removed
                include: [{
                    model: User,
                    as: 'assignedToUser',
                    attributes: ['id', 'username', 'email', 'role', 'department']
                }]
            },
            {
                model: AuditFindingEscalation,
                as: 'AuditFindingEscalations',
                attributes: ['escalated_to_id', 'escalated_by_id', 'created_at'],
                include: [{
                    model: User,
                    as: 'escalatedToUser',
                    attributes: ['id', 'username', 'email', 'role', 'department']
                },
                {
                    model: User,
                    as: 'escalatedByUser',
                    attributes: ['id', 'username', 'email', 'role', 'department']
                }]
            },
            { model: AuditAmendmentHistory, as: 'AuditAmendmentHistories' },
            { model: AssignedNotification },
            { model: EscalationNotification },
            { model: AuditFindingRectification },
            { model: ActionPlan },
            { model: Category },
            { model: RiskLevel },
            { model: RiskRating }
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found.' });
      }

      res.json(auditFinding);
    } catch (error) {
      console.error('Error fetching audit finding by ID:', error);
      res.status(500).json({ error: 'Error fetching audit finding.' });
    }
  }
}

module.exports = new AuditFindingController();
