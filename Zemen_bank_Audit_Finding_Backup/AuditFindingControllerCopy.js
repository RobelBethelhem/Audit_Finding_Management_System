const BaseController = require('./BaseController');
const { AuditFinding, User, AuditFindingAssigned, AuditFindingEscalation, AuditAmendmentHistory, AssignedNotification, EscalationNotification, AuditFindingRectification, ActionPlan, ActionPlanEvidence, ActionPlanAmendmentHistory, ActionPlanResponsiblePerson, Category, RiskLevel, RiskRating, AuditRectificationEvidence, AuditRectificationAmendmentHistory, SystemVulnerability, ComplianceGap, RelevantStandard } = require('../models');
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

    // Check if user is Admin (Admin can create findings regardless of department)
    const isAdmin = currentUser.role === 'Admin';
    const isRoleAllowed = Object.keys(allowedCreatorRoles).includes(currentUser.role);
    const isDepartmentMatch = allowedCreatorRoles[currentUser.role] === currentUser.department;

    if (!isAdmin && (!isRoleAllowed || !isDepartmentMatch)) {
      return res.status(403).json({ error: 'Unauthorized role or department to create Audit Findings.' });
    }

    try {
      const {
        title, description, criteria, cause, impact, recommendation,
        amount, risk_level_id, category_id, risk_rating_id, status,
        initial_assigned_to_id, vulnerability_id, compliance_gap_id, standard_id,
        due_date, supporting_documentation
      } = req.body;

      if (!title || !description || !criteria || !cause || !impact || !recommendation ||
          !amount || !risk_level_id || !category_id || !risk_rating_id) {
        return res.status(400).json({ error: 'All essential fields are required to create an Audit Finding.' });
      }

      // Check if IT_Audit department requires additional fields
      if (currentUser.department === 'IT_Audit') {
        if (!vulnerability_id || !compliance_gap_id || !standard_id) {
          return res.status(400).json({ 
            error: 'IT Audit findings require vulnerability_id, compliance_gap_id, and standard_id fields.' 
          });
        }
      }

      const auditFindingData = {
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
        created_by_id: currentUser.id,
        due_date: due_date || null,
        supporting_documentation: supporting_documentation || null
      };

      // Add IT_Audit specific fields only if department is IT_Audit
      if (currentUser.department === 'IT_Audit') {
        auditFindingData.vulnerability_id = vulnerability_id;
        auditFindingData.compliance_gap_id = compliance_gap_id;
        auditFindingData.standard_id = standard_id;
      }

      const auditFinding = await AuditFinding.create(auditFindingData);

      // await AuditFindingAssigned.create({
      //   finding_id: auditFinding.id,
      //   assigned_to_id: initial_assigned_to_id || currentUser.id,
      // });

      res.status(201).json(auditFinding);

    } catch (error) {
      console.error('Error creating Audit Finding:', error);
      res.status(500).json({ error: 'Error creating Audit Finding.' });
    }
  }

  async update(req, res) {
    const auditFinding = req.auditFinding;
    const currentUser = req.user;
    const updateData = { ...req.body };

    try {
      // If updating an IT_Audit department finding, validate required fields
      if (currentUser.department === 'IT_Audit') {
        const { vulnerability_id, compliance_gap_id, standard_id } = updateData;
        
        if (
          (updateData.hasOwnProperty('vulnerability_id') && !vulnerability_id) ||
          (updateData.hasOwnProperty('compliance_gap_id') && !compliance_gap_id) ||
          (updateData.hasOwnProperty('standard_id') && !standard_id)
        ) {
          return res.status(400).json({ 
            error: 'IT Audit findings require vulnerability_id, compliance_gap_id, and standard_id fields.' 
          });
        }
      } else {
        // For non-IT_Audit departments, ensure these fields are null if present in request
        updateData.vulnerability_id = null;
        updateData.compliance_gap_id = null;
        updateData.standard_id = null;
      }

      await auditFinding.update(updateData);

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
        // Add the new IT_Audit specific fields
        vulnerability_id: auditFinding.vulnerability_id,
        compliance_gap_id: auditFinding.compliance_gap_id,
        standard_id: auditFinding.standard_id,
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
    const { rectification_description } = req.body;
    const currentUser = req.user;
    const file = req.file; // Get the uploaded file from multer

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!rectification_description) {
      return res.status(400).json({ error: 'Rectification description is required.' });
    }

    try {
      // First, get the audit finding without trying to select non-existent columns
      const auditFinding = await AuditFinding.findByPk(id, {
        attributes: [
          'id', 'title', 'description', 'criteria', 'cause', 'impact', 
          'recommendation', 'amount', 'risk_level_id', 'category_id', 
          'risk_rating_id', 'created_by_id', 'status', 'rectification_id', 
          'vulnerability_id', 'compliance_gap_id', 'standard_id', 
          'created_at', 'updated_at'
        ]
      });

      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found.' });
      }

      // Then separately check if the user is assigned to this finding
      const isAssigned = await AuditFindingAssigned.findOne({
        where: { 
          finding_id: id,
          assigned_to_id: currentUser.id
        }
      });

      // Check if the finding is escalated to the current user
      const isEscalatedToCurrentUser = await AuditFindingEscalation.findOne({
        where: {
          finding_id: id,
          escalated_to_id: currentUser.id
        }
      });

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

      // Create the rectification record - using rectification_text field as per the model
      const rectification = await AuditFindingRectification.create({
        submitted_by_id: currentUser.id,
        finding_id: auditFinding.id, // Using finding_id as per the model
        rectification_text: rectification_description, // Changed from rectification to rectification_text
        status: 'Pending'
      });

      // Handle file upload if provided
      if (file) {
        // Create evidence record for the uploaded file
        await AuditRectificationEvidence.create({
          rectification_id: rectification.rectification_id,
          rectification_evidence_url: file.path, // Path where multer saved the file
          rectification_file_name: file.originalname,
          rectification_file_type: file.mimetype
        });
      }

      // Update the AuditFinding status
      auditFinding.status = 'Under_Rectification';
      auditFinding.rectification_id = rectification.rectification_id; // Using rectification_id as per the model
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
        rectification_id: rectification.rectification_id, // Using rectification_id as per the model
        rectification: rectification.rectification_text, // Using rectification_text as per the model
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
      // First, check if the audit finding exists with explicit attributes
      const auditFinding = await AuditFinding.findByPk(id, {
        attributes: [
          'id', 'title', 'description', 'criteria', 'cause', 'impact', 
          'recommendation', 'amount', 'risk_level_id', 'category_id', 
          'risk_rating_id', 'created_by_id', 'status', 'rectification_id', 
          'vulnerability_id', 'compliance_gap_id', 'standard_id', 
          'created_at', 'updated_at'
        ]
      });
      
      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found.' });
      }
      
      // Then, find the pending or amended rectification
      const rectification = await AuditFindingRectification.findOne({
        where: {
          finding_id: id,
          status: {
            [Op.in]: ['Pending', 'Amended'] // Allow both Pending and Amended statuses
          }
        }
      });
      
      if (!rectification) {
        return res.status(404).json({ error: 'No pending or amended rectification found for this Audit Finding.' });
      }
      
      // Get the creator information
      const creatorUser = await User.findByPk(auditFinding.created_by_id, {
        attributes: ['id', 'role', 'department']
      });
      
      if (!creatorUser) {
        return res.status(404).json({ error: 'Creator of the Audit Finding not found.' });
      }
      
      const currentRole = currentUser.role;
      const currentDepartment = currentUser.department;
      const creatorRole = creatorUser.role;
      const creatorDepartment = creatorUser.department;

      let isAuthorized = false;

      // Rule 0: Admin users can approve/reject any rectification
      if (currentRole === 'Admin') {
          isAuthorized = true;
      }

      // Rule 1: The original creator of the Audit Finding can approve/reject
      if (!isAuthorized && currentUser.id === creatorUser.id) {
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
      req.rectification = rectification;
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
      // First, check if the audit finding exists with explicit attributes
      const auditFinding = await AuditFinding.findByPk(id, {
        attributes: [
          'id', 'title', 'description', 'criteria', 'cause', 'impact', 
          'recommendation', 'amount', 'risk_level_id', 'category_id', 
          'risk_rating_id', 'created_by_id', 'status', 'rectification_id', 
          'vulnerability_id', 'compliance_gap_id', 'standard_id', 
          'created_at', 'updated_at'
        ]
      });
      
      if (!auditFinding) {
        return res.status(404).json({ error: 'Audit Finding not found.' });
      }
      
      // Then, find the rejected or amended rectification
      const rectification = await AuditFindingRectification.findOne({
        where: {
          finding_id: id,
          status: {
            [Op.in]: ['Rejected', 'Amended'] // Allow both Rejected and Amended statuses
          }
        }
      });
      
      if (!rectification) {
        return res.status(404).json({ error: 'No rejected or amended rectification found for this Audit Finding.' });
      }
      
      // Check if user is assigned to this finding
      const isAssigned = await AuditFindingAssigned.findOne({
        where: {
          finding_id: id,
          assigned_to_id: currentUser.id
        }
      });
      
      // Check if finding is escalated to this user
      const isEscalated = await AuditFindingEscalation.findOne({
        where: {
          finding_id: id,
          escalated_to_id: currentUser.id
        }
      });
      
      // Define supervisor roles
      const supervisorRoles = [
        'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor',
      ];
      
      let isAuthorized = false;
      
      // Original submitter can always update
      if (currentUser.id === rectification.submitted_by_id) {
        isAuthorized = true;
      }
      // Supervisors can update if they're assigned or it's escalated to them
      else if (supervisorRoles.includes(currentUser.role) && (isAssigned || isEscalated)) {
        isAuthorized = true;
      }
      // Admin can always update
      else if (currentUser.role === 'Admin') {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return res.status(403).json({ 
          error: 'Unauthorized to amend this rectification. Only the original submitter, assigned supervisors, or an Admin can amend rectifications.' 
        });
      }

      req.auditFinding = auditFinding;
      req.rectification = rectification;
      next();

    } catch (error) {
      console.error('Error in authorizeRectificationUpdate:', error);
      res.status(500).json({ error: 'Internal server error during rectification update authorization.' });
    }
  }

  // Method to approve rectification
  async approveRectification(req, res) {
    const auditFinding = req.auditFinding;
    const rectification = req.rectification; // Changed from pendingRectification
    const currentUser = req.user;

    try {
      rectification.status = 'Approved';
       rectification.approved_by_id = currentUser.id;
      await rectification.save();

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
        rectification_id: rectification.rectification_id,
        rectification: rectification.rectification_text, // Changed from rectification to rectification_text
        status: rectification.status,
      });

      res.status(200).json({
        message: 'Rectification approved and Audit Finding status changed to Resolved.',
        auditFinding,
        rectification: rectification
      });

    } catch (error) {
      console.error('Error approving rectification:', error);
      res.status(500).json({ error: 'Error approving rectification.' });
    }
  }

  // Modified method to reject rectification
  async rejectRectification(req, res) {
    const auditFinding = req.auditFinding;
    const rectification = req.rectification; // Changed from pendingRectification
    const currentUser = req.user;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a rectification.' });
    }

    try {
      console.log('Rejecting rectification:', rectification.rectification_id);
      
      // Update rectification status
      rectification.status = 'Rejected';
      rectification.reason = rejection_reason;
      await rectification.save();
      
      console.log('Rectification updated to Rejected');

      // Update audit finding status
      const oldStatus = auditFinding.status;
      auditFinding.status = 'In_Progress';
      await auditFinding.save();
      
      console.log(`Audit Finding status changed from ${oldStatus} to In_Progress`);

      // Create audit amendment history
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
      
      console.log('Audit Amendment History created');

      // Create rectification amendment history
      await AuditRectificationAmendmentHistory.create({
        amend_by_id: currentUser.id,
        rectification_id: rectification.rectification_id,
        rectification: rectification.rectification_text,
        status: rectification.status,
        rejection_reason: rejection_reason
      });
      
      console.log('Rectification Amendment History created');

      res.status(200).json({
        message: 'Rectification rejected and Audit Finding status changed to In_Progress.',
        auditFinding,
        rectification: rectification,
        rejection_reason
      });

    } catch (error) {
      console.error('Error rejecting rectification:', error);
      console.error('Error details:', error.message);
      if (error.errors) {
        error.errors.forEach(err => console.error(err.message));
      }
      res.status(500).json({ error: 'Error rejecting rectification.' });
    }
  }

  // New method to update/amend a rejected rectification
  async updateRectification(req, res) {
    const auditFinding = req.auditFinding;
    const rectification = req.rectification; // Changed from rejectedRectification
    const currentUser = req.user;
    const { rectification_description } = req.body;
    const file = req.file; // Get the uploaded file from multer

    console.log('Request body:', req.body);
    console.log('File:', file ? `${file.originalname} (${file.size} bytes)` : 'No file uploaded');

    if (!rectification_description) {
      return res.status(400).json({ error: 'Rectification description is required for amendment.' });
    }

    try {
      console.log('Amending rectification:', rectification.rectification_id);
      
      // Update the rectification details and status
      rectification.rectification_text = rectification_description; // Changed from rectification to rectification_text
      rectification.status = 'Amended';
      // Clear any previous rejection reason
      rectification.reason = null;
      await rectification.save();
      
      console.log('Rectification updated to Amended');

      // Handle file upload if provided - PRESERVE FILE HISTORY
      if (file) {
        try {
          // Create new evidence record for the uploaded file (DO NOT DELETE EXISTING RECORDS)
          // This preserves the complete file upload history for audit trail purposes
          await AuditRectificationEvidence.create({
            rectification_id: rectification.rectification_id,
            rectification_evidence_url: file.path, // Path where multer saved the file
            rectification_file_name: file.originalname,
            rectification_file_type: file.mimetype
          });

          console.log('New evidence record created for file (preserving history):', file.originalname);
        } catch (fileError) {
          console.error('Error handling file upload:', fileError);
          // Continue with the process even if file handling fails
        }
      }

      // Change Audit Finding status back to 'Under_Rectification'
      const oldStatus = auditFinding.status;
      auditFinding.status = 'Under_Rectification';
      // The rectification_id on auditFinding should already point to this one.
      await auditFinding.save();
      
      console.log(`Audit Finding status changed from ${oldStatus} to Under_Rectification`);

      // Create audit amendment history
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
      
      console.log('Audit Amendment History created');

      // Create rectification amendment history
      await AuditRectificationAmendmentHistory.create({
        amend_by_id: currentUser.id,
        rectification_id: rectification.rectification_id,
        rectification: rectification_description, // Use the new description
        status: rectification.status, // 'Amended'
      });
      
      console.log('Rectification Amendment History created');

      res.status(200).json({
        message: 'Rectification amended successfully and Audit Finding status updated to Under_Rectification.',
        auditFinding,
        rectification: rectification,
        evidence: file ? {
          filename: file.originalname,
          path: file.path,
          type: file.mimetype
        } : null
      });

    } catch (error) {
      console.error('Error updating rectification:', error);
      console.error('Error details:', error.message);
      if (error.errors) {
        error.errors.forEach(err => console.error(err.message));
      }
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

      // Store search conditions separately to combine later
      let searchConditions = null;
      if (search) {
        searchConditions = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      const currentUserRole = currentUser.role;
      const currentUserDepartment = currentUser.department;



      let baseWhereConditions = [];

      // Always include findings created by the current user
      baseWhereConditions.push({ created_by_id: currentUser.id });

      // Include findings assigned to the current user - using a subquery approach
      const assignedFindingIds = await AuditFindingAssigned.findAll({
        where: { assigned_to_id: currentUser.id },
        attributes: ['finding_id'],
        raw: true
      });

      if (assignedFindingIds.length > 0) {
        const findingIds = assignedFindingIds.map(item => item.finding_id);
        baseWhereConditions.push({ id: { [Op.in]: findingIds } });
      }

      // Include findings where the current user is a responsible person in action plans
      const userResponsibleActionPlans = await ActionPlanResponsiblePerson.findAll({
        where: { user_id: currentUser.id },
        attributes: ['action_plan_id'],
        raw: true
      });

      if (userResponsibleActionPlans.length > 0) {
        const userActionPlanIds = userResponsibleActionPlans.map(item => item.action_plan_id);

        // Get audit finding IDs from these action plans
        const userActionPlanFindingIds = await ActionPlan.findAll({
          where: { action_plan_id: { [Op.in]: userActionPlanIds } },
          attributes: ['audit_finding_id'],
          raw: true
        });

        if (userActionPlanFindingIds.length > 0) {
          const userResponsibleFindingIds = userActionPlanFindingIds.map(item => item.audit_finding_id);
          baseWhereConditions.push({ id: { [Op.in]: userResponsibleFindingIds } });
        }
      }

      // Group 1: Department-wide access roles (see ALL findings from their department)
      const departmentWideAccessRoles = [
        'Audit_Supervisor', 'Audit_Director',
        'IT_Auditors_Supervisor', 'IT_Auditors_Director',
        'Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'
      ];

      // Group 2: Enhanced subordinate access roles (see own + assigned + subordinates' created + subordinates' assigned)
      const enhancedSubordinateAccessRoles = [
        'Auditee_Supervisor', 'Auditee_Super_Supervisor',
        'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
        'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor'
      ];

      if (departmentWideAccessRoles.includes(currentUserRole)) {
        // Department-wide access: See ALL findings from their department
        baseWhereConditions.push({
          '$createdBy.department$': currentUserDepartment
        });
      } else if (enhancedSubordinateAccessRoles.includes(currentUserRole)) {
        // Enhanced subordinate access control
        // They can see findings created by OR assigned to their direct or indirect supervisees within the same department type.
        const descendentIds = await UserService.getDescendentUserIds(currentUser.id);
        descendentIds.push(currentUser.id); // Include the supervisor themselves

        // Condition 1: Findings created by subordinates (existing functionality)
        baseWhereConditions.push({
          '$createdBy.id$': { [Op.in]: descendentIds },
          '$createdBy.department$': currentUserDepartment // Must be in the same department
        });

        // Condition 2: Findings assigned to subordinates (new functionality)
        // Get findings assigned to subordinates, but only show if the creator is in the same department
        const subordinateAssignedFindingIds = await AuditFindingAssigned.findAll({
          where: { assigned_to_id: { [Op.in]: descendentIds } },
          attributes: ['finding_id'],
          raw: true
        });

        if (subordinateAssignedFindingIds.length > 0) {
          const subordinateFindingIds = subordinateAssignedFindingIds.map(item => item.finding_id);

          // Add condition for findings assigned to subordinates, with department filtering
          baseWhereConditions.push({
            id: { [Op.in]: subordinateFindingIds },
            '$createdBy.department$': currentUserDepartment // Must be in the same department
          });
        }

        // Condition 3: Findings where supervisor or subordinates are responsible persons in action plans
        // Get action plans where supervisor or subordinates are responsible persons
        const responsiblePersonActionPlans = await ActionPlanResponsiblePerson.findAll({
          where: { user_id: { [Op.in]: descendentIds } },
          attributes: ['action_plan_id'],
          raw: true
        });

        if (responsiblePersonActionPlans.length > 0) {
          const actionPlanIds = responsiblePersonActionPlans.map(item => item.action_plan_id);

          // Get audit finding IDs from these action plans
          const actionPlanFindingIds = await ActionPlan.findAll({
            where: { action_plan_id: { [Op.in]: actionPlanIds } },
            attributes: ['audit_finding_id'],
            raw: true
          });

          if (actionPlanFindingIds.length > 0) {
            const responsiblePersonFindingIds = actionPlanFindingIds.map(item => item.audit_finding_id);

            // Add condition for findings where supervisor/subordinates are responsible persons, with department filtering
            baseWhereConditions.push({
              id: { [Op.in]: responsiblePersonFindingIds },
              '$createdBy.department$': currentUserDepartment // Must be in the same department
            });
          }
        }
      }



      // Build the final where conditions
      if (currentUserRole === 'Admin') {
          // Admin can see all findings - no additional restrictions
          // Keep existing basic filters (status, category, etc.)
      } else {
          // Combine all valid conditions with OR for non-admin users
          if (baseWhereConditions.length > 0) {
              // Combine access control conditions
              const accessControlCondition = { [Op.or]: baseWhereConditions };

              // If we have search conditions, combine them with access control
              if (searchConditions) {
                  where[Op.and] = [
                      accessControlCondition,
                      { [Op.or]: searchConditions }
                  ];
              } else {
                  // No search, just apply access control
                  where[Op.or] = baseWhereConditions;
              }
          } else {
              // If no specific conditions apply, prevent showing anything by default
              where.id = null; // No findings will match, effectively returning empty
          }
      }

      // For Admin users with search, apply search conditions
      if (currentUserRole === 'Admin' && searchConditions) {
          if (where[Op.and]) {
              where[Op.and].push({ [Op.or]: searchConditions });
          } else {
              where[Op.or] = searchConditions;
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
            // Simplified includes to avoid database schema issues
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
                as: 'createdBy',
                attributes: ['id', 'username', 'email', 'role', 'department']
            },
            {
                model: Category,
                attributes: ['id', 'category_name']
            },
            {
                model: RiskLevel,
                attributes: ['id', 'risk_level_name']
            },
            {
                model: RiskRating,
                attributes: ['id', 'risk_rating_name']
            },
            {
                model: SystemVulnerability,
                as: 'SystemVulnerability',
                attributes: ['id', 'vulnerability_name', 'vulnerability_description'],
                required: false
            },
            {
                model: ComplianceGap,
                as: 'ComplianceGap',
                attributes: ['id', 'gap_name', 'gap_description'],
                required: false
            },
            {
                model: RelevantStandard,
                as: 'RelevantStandard',
                attributes: ['id', 'standard_name', 'standard_description'],
                required: false
            },
            {
                model: AuditAmendmentHistory,
                as: 'AuditAmendmentHistories',
                attributes: [
                    'amendment_id', 'audit_finding_id', 'amend_by_id', 'title', 'description',
                    'criteria', 'cause', 'impact', 'recommendation', 'amount', 'risk_level_id',
                    'category_id', 'risk_rating_id', 'vulnerability_id', 'compliance_gap_id',
                    'standard_id', 'created_by_id', 'status', 'rectification_id', 'amended_at'
                ],
                include: [
                    {
                        model: User,
                        as: 'amendedBy',
                        attributes: ['id', 'username', 'email', 'role', 'department']
                    },
                    {
                        model: User,
                        as: 'createdBy',
                        attributes: ['id', 'username', 'email', 'role', 'department']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'category_name']
                    },
                    {
                        model: RiskLevel,
                        as: 'riskLevel',
                        attributes: ['id', 'risk_level_name']
                    },
                    {
                        model: RiskRating,
                        as: 'riskRating',
                        attributes: ['id', 'risk_rating_name']
                    }
                ],
                required: false,
                order: [['amended_at', 'DESC']]
            },
            {
                model: AuditFindingAssigned,
                attributes: ['assigned_id', 'finding_id', 'assigned_to_id', 'assigned_by_id', 'assigned_at'],
                include: [
                    {
                        model: User,
                        as: 'assignedToUser',
                        attributes: ['id', 'username', 'email', 'role', 'department']
                    },
                    {
                        model: User,
                        as: 'assignedByUser',
                        attributes: ['id', 'username', 'email', 'role', 'department']
                    }
                ],
                required: false,
                order: [['assigned_at', 'DESC']]
            },
            {
                model: AuditFindingRectification,
                attributes: [
                    'rectification_id', 'finding_id', 'submitted_by_id', 'rectification_text',
                    'status', 'reason', 'approved_by_id', 'approved_at', 'created_at', 'updated_at'
                ],
                include: [
                    {
                        model: User,
                        as: 'submittedBy',
                        attributes: ['id', 'username', 'email', 'role', 'department']
                    },

                    {
                        model: AuditRectificationEvidence,
                        as: 'AuditRectificationEvidences',
                        attributes: [
                            'evidence_id', 'rectification_evidence_url', 'rectification_file_name',
                            'rectification_file_type', 'created_at'
                        ],
                        required: false
                    },
                    {
                        model: AuditRectificationAmendmentHistory,
                        as: 'AuditRectificationAmendmentHistories',
                        attributes: [
                            'amendment_id', 'rectification_id', 'amend_by_id', 'rectification',
                            'status', 'rejection_reason', 'amended_at'
                        ],
                        include: [
                            {
                                model: User,
                                as: 'amendedBy',
                                attributes: ['id', 'username', 'email', 'role', 'department']
                            }
                        ],
                        required: false,
                        order: [['amended_at', 'DESC']]
                    }
                ],
                required: false
            },
            {
                model: ActionPlan,
                attributes: [
                    'action_plan_id', 'audit_finding_id', 'submitted_by_id', 'action_plan',
                    'timeline', 'due_date', 'status', 'created_at', 'updated_at'
                ],
                include: [
                    {
                        model: User,
                        as: 'submittedBy',
                        attributes: ['id', 'username', 'email', 'role', 'department']
                    },
                    {
                        model: ActionPlanEvidence,
                        as: 'evidences',
                        attributes: [
                            'evidence_id', 'file_path', 'file_name',
                            'file_type', 'created_at'
                        ],
                        required: false
                    },
                    {
                        model: ActionPlanAmendmentHistory,
                        as: 'amendmentHistory',
                        attributes: [
                            'id', 'action_plan_id', 'amend_by_id', 'action_plan',
                            'timeline', 'status', 'changes', 'amended_at'
                        ],
                        include: [
                            {
                                model: User,
                                as: 'amendedBy',
                                attributes: ['id', 'username', 'email', 'role', 'department']
                            }
                        ],
                        required: false,
                        order: [['amended_at', 'DESC']]
                    },

                ],
                required: false
            }
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

async getMyCreatedFindings(req, res) {
    try {
      const currentUser = req.user;
      
      if (!currentUser) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      
      const findings = await AuditFinding.findAll({
        where: { created_by_id: currentUser.id },
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'username', 'email', 'department', 'role']
          },
          {
            model: AuditFindingAssigned,
            as: 'AuditFindingAssigneds',
            include: [{
              model: User,
              as: 'assignedToUser',
              attributes: ['id', 'username', 'email', 'department', 'role']
            }]
          },
          {
            model: Category,
            attributes: ['id', 'name', 'description']
          },
          {
            model: RiskLevel,
            attributes: ['id', 'name', 'description']
          },
          {
            model: RiskRating,
            attributes: ['id', 'name', 'description']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      
      res.status(200).json(findings);
    } catch (error) {
      console.error('Error fetching created audit findings:', error);
      res.status(500).json({ error: 'Error fetching created audit findings.' });
    }
  }

  // Download rectification evidence file
  async downloadRectificationEvidence(req, res) {
    try {
      const { evidenceId } = req.params;

      // Find the rectification evidence record
      const evidence = await AuditRectificationEvidence.findByPk(evidenceId);

      if (!evidence) {
        return res.status(404).json({ error: 'Rectification evidence file not found' });
      }

      // Find the associated rectification and audit finding
      const rectification = await AuditFindingRectification.findByPk(evidence.rectification_id, {
        include: [{
          model: AuditFinding,
          as: 'AuditFinding'
        }]
      });

      if (!rectification) {
        return res.status(404).json({ error: 'Associated rectification not found' });
      }

      // Check file exists on disk
      const fs = require('fs');
      const path = require('path');

      const filePath = evidence.rectification_evidence_url;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Rectification evidence file not found on server' });
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${evidence.rectification_file_name}"`);
      res.setHeader('Content-Type', evidence.rectification_file_type || 'application/octet-stream');

      // Send the file
      res.sendFile(path.resolve(filePath));

    } catch (error) {
      console.error('Error downloading rectification evidence:', error);
      res.status(500).json({ error: 'Failed to download rectification evidence file' });
    }
  }

}

module.exports = new AuditFindingController();
