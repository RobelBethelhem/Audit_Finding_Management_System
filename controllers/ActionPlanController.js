// controllers/ActionPlanController.js
const BaseController = require('./BaseController');
const {
  ActionPlan,
  User,
  AuditFinding,
  ActionPlanResponsiblePerson,
  ActionPlanResource,
  ActionPlanEvidence,
  AuditFindingEscalation,
  ActionPlanAmendmentHistory,
  AuditFindingAssigned,
  AuditAmendmentHistory,
  Resource,
  Evidence,
  sequelize // Add sequelize here
} = require('../models');
const { Op } = require('sequelize');
const UserService = require('../services/userService'); 

class ActionPlanController extends BaseController {
  constructor() {
    super(ActionPlan);
    // this.include = [
    //   { model: AuditFinding, include: ['assignedTo', 'assignedBy'] },
    //   { model: User, as: 'submittedBy' },
    //   { model: User, as: 'responsiblePersons' },
    //   { model: ActionPlanResource, as: 'resources' },
    //   { model: ActionPlanEvidence, as: 'evidences' }
    // ];
  }


  

 async authorizeActionPlanAccess(req, res, next) {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      // Use raw query to avoid Sequelize trying to select removed columns
      const actionPlan = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id,
          ap.progress_percentage, ap.progress_justification,
          ap.created_at, ap.updated_at
        FROM action_plans ap
        WHERE ap.action_plan_id = ?`,
        {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );

      if (!actionPlan) {
        return res.status(404).json({ error: 'Action Plan not found.' });
      }

      // Load associations manually
      const submittedBy = await User.findByPk(actionPlan.submitted_by_id, {
        attributes: ['id', 'username', 'email', 'role', 'department'] // Include department
      });
      
      if (!submittedBy) {
        return res.status(404).json({ error: 'Submitter of the Action Plan not found.' });
      }
      
      // Get audit finding without trying to select non-existent columns
      const auditFinding = await sequelize.query(
        `SELECT 
          id, title, description, criteria, cause, impact, recommendation, 
          amount, risk_level_id, category_id, risk_rating_id, created_by_id, 
          status, rectification_id, vulnerability_id, compliance_gap_id, standard_id, 
          created_at, updated_at
        FROM audit_findings
        WHERE id = ?`,
        {
          replacements: [actionPlan.audit_finding_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      // Get assignments for this audit finding
      const assignments = await AuditFindingAssigned.findAll({
        where: { finding_id: actionPlan.audit_finding_id },
        include: [
          { 
            model: User, 
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'role'] 
          },
          { 
            model: User, 
            as: 'assignedByUser',
            attributes: ['id', 'username', 'email', 'role'] 
          }
        ]
      });
      
      // Get escalations for this audit finding
      const escalations = await AuditFindingEscalation.findAll({
        where: { finding_id: actionPlan.audit_finding_id }
      });
      
      // Add assignments and escalations to audit finding
      auditFinding.AuditFindingAssigneds = assignments;
      auditFinding.AuditFindingEscalations = escalations;
      
      const responsiblePersons = await ActionPlanResponsiblePerson.findAll({
        where: { action_plan_id: actionPlan.action_plan_id }
      });

      // Authorization logic
      const currentUserIsSubmittedBy = (currentUser.id === submittedBy.id);
      const currentUserIsResponsiblePerson = responsiblePersons.some(
        rp => rp.user_id === currentUser.id
      );

      // Check if current user is assigned to the finding
      let currentUserIsAssignedToFinding = false;
      if (auditFinding && auditFinding.AuditFindingAssigneds) {
        currentUserIsAssignedToFinding = auditFinding.AuditFindingAssigneds.some(
          assignment => assignment.assigned_to_id === currentUser.id
        );
      }

      // Check if current user is a supervisor or director based on department
      let isSupervisorOrDirector = false;
      const submitterDepartment = submittedBy.department;
      const currentUserRole = currentUser.role;
      const currentUserDepartment = currentUser.department;

      // Check for specific supervisor/director roles based on department
      if (submitterDepartment === 'Business' && currentUserDepartment === 'Business') {
        if (currentUserRole === 'Audit_Supervisor' || currentUserRole === 'Audit_Director') {
          isSupervisorOrDirector = true;
        }
      } else if (submitterDepartment === 'Inspection' && currentUserDepartment === 'Inspection') {
        if (currentUserRole === 'Inspection_Auditors_Supervisor' || currentUserRole === 'Inspection_Auditors_Director') {
          isSupervisorOrDirector = true;
        }
      } else if (submitterDepartment === 'IT_Audit' && currentUserDepartment === 'IT_Audit') {
        if (currentUserRole === 'IT_Auditors_Supervisor' || currentUserRole === 'IT_Auditors_Director') {
          isSupervisorOrDirector = true;
        }
      }

      const isAuthorized = currentUserIsSubmittedBy ||
                           currentUserIsAssignedToFinding ||
                           currentUserIsResponsiblePerson ||
                           isSupervisorOrDirector ||
                           currentUser.role === 'Admin';

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized to change status of this Action Plan.' });
      }

      req.actionPlan = actionPlan;
      next();

    } catch (error) {
      console.error('Error in authorizeActionPlanStatusChange:', error);
      res.status(500).json({ error: 'Internal server error during Action Plan status authorization.' });
    }
  }

  async authorizeActionPlanStatusChange(req, res, next) {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      // Use raw query to avoid Sequelize trying to select removed columns
      const actionPlan = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id,
          ap.progress_percentage, ap.progress_justification,
          ap.created_at, ap.updated_at
        FROM action_plans ap
        WHERE ap.action_plan_id = ?`,
        {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );

      if (!actionPlan) {
        return res.status(404).json({ error: 'Action Plan not found.' });
      }

      // Load associations manually
      const submittedBy = await User.findByPk(actionPlan.submitted_by_id, {
        attributes: ['id', 'username', 'email', 'role', 'department'] // Include department
      });
      
      if (!submittedBy) {
        return res.status(404).json({ error: 'Submitter of the Action Plan not found.' });
      }
      
      // Get audit finding without trying to select non-existent columns
      const auditFinding = await sequelize.query(
        `SELECT 
          id, title, description, criteria, cause, impact, recommendation, 
          amount, risk_level_id, category_id, risk_rating_id, created_by_id, 
          status, rectification_id, vulnerability_id, compliance_gap_id, standard_id, 
          created_at, updated_at
        FROM audit_findings
        WHERE id = ?`,
        {
          replacements: [actionPlan.audit_finding_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      // Get assignments for this audit finding
      const assignments = await AuditFindingAssigned.findAll({
        where: { finding_id: actionPlan.audit_finding_id },
        include: [
          { 
            model: User, 
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'role'] 
          },
          { 
            model: User, 
            as: 'assignedByUser',
            attributes: ['id', 'username', 'email', 'role'] 
          }
        ]
      });
      
      // Get escalations for this audit finding
      const escalations = await AuditFindingEscalation.findAll({
        where: { finding_id: actionPlan.audit_finding_id }
      });
      
      // Add assignments and escalations to audit finding
      auditFinding.AuditFindingAssigneds = assignments;
      auditFinding.AuditFindingEscalations = escalations;
      
      const responsiblePersons = await ActionPlanResponsiblePerson.findAll({
        where: { action_plan_id: actionPlan.action_plan_id }
      });

      // Authorization logic
      const currentUserIsSubmittedBy = (currentUser.id === submittedBy.id);
      const currentUserIsResponsiblePerson = responsiblePersons.some(
        rp => rp.user_id === currentUser.id
      );

      // Check if current user is assigned to the finding
      let currentUserIsAssignedToFinding = false;
      if (auditFinding && auditFinding.AuditFindingAssigneds) {
        currentUserIsAssignedToFinding = auditFinding.AuditFindingAssigneds.some(
          assignment => assignment.assigned_to_id === currentUser.id
        );
      }

      // Check if current user is a supervisor or director based on department
      let isSupervisorOrDirector = false;
      const submitterDepartment = submittedBy.department;
      const currentUserRole = currentUser.role;
      const currentUserDepartment = currentUser.department;

      // Check for specific supervisor/director roles based on department
      if (submitterDepartment === 'Business' && currentUserDepartment === 'Business') {
        if (currentUserRole === 'Audit_Supervisor' || currentUserRole === 'Audit_Director') {
          isSupervisorOrDirector = true;
        }
      } else if (submitterDepartment === 'Inspection' && currentUserDepartment === 'Inspection') {
        if (currentUserRole === 'Inspection_Auditors_Supervisor' || currentUserRole === 'Inspection_Auditors_Director') {
          isSupervisorOrDirector = true;
        }
      } else if (submitterDepartment === 'IT_Audit' && currentUserDepartment === 'IT_Audit') {
        if (currentUserRole === 'IT_Auditors_Supervisor' || currentUserRole === 'IT_Auditors_Director') {
          isSupervisorOrDirector = true;
        }
      }

      const isAuthorized = currentUserIsSubmittedBy ||
                           currentUserIsAssignedToFinding ||
                           currentUserIsResponsiblePerson ||
                           isSupervisorOrDirector ||
                           currentUser.role === 'Admin';

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized to change status of this Action Plan.' });
      }

      req.actionPlan = actionPlan;
      next();

    } catch (error) {
      console.error('Error in authorizeActionPlanStatusChange:', error);
      res.status(500).json({ error: 'Internal server error during Action Plan status authorization.' });
    }
  }

  // async create(req, res) {
  //   const { responsiblePersons, resources, ...actionPlanData } = req.body;
  //   const t = await this.model.sequelize.transaction();
    
  //   try {
  //     const actionPlan = await this.model.create(actionPlanData, { transaction: t });
      
  //     if (responsiblePersons && responsiblePersons.length) {
  //       await ActionPlanResponsiblePerson.bulkCreate(
  //         responsiblePersons.map(userId => ({ 
  //           action_plan_id: actionPlan.id, 
  //           user_id: userId 
  //         })), 
  //         { transaction: t }
  //       );
  //     }
      
  //     if (resources && resources.length) {
  //       await ActionPlanResource.bulkCreate(
  //         resources.map(resourceId => ({ 
  //           action_plan_id: actionPlan.id, 
  //           resource_id: resourceId 
  //         })), 
  //         { transaction: t }
  //       );
  //     }
      
  //     await t.commit();
  //     req.include = this.include;
  //     req.params = { id: actionPlan.id };
  //     return this.findById(req, res);
  //   } catch (error) {
  //     await t.rollback();
  //     res.status(400).json({ error: error.message });
  //   }
  // }

  // async updateActionPlan(req, res) {
  //   const t = await this.model.sequelize.transaction();
  //   try {
  //     // Get current state
  //     const currentActionPlan = await this.model.findByPk(req.params.id, { 
  //       include: [ActionPlanResponsiblePerson, ActionPlanResource],
  //       transaction: t 
  //     });

  //     // Update the action plan
  //     const [updated] = await this.model.update(req.body, {
  //       where: { id: req.params.id },
  //       transaction: t
  //     });

  //     if (!updated) {
  //       await t.rollback();
  //       return res.status(404).json({ error: 'Not found' });
  //     }

  //     // Track changes
  //     const changes = {};
  //     Object.keys(req.body).forEach(key => {
  //       if (currentActionPlan[key] !== req.body[key] && key !== 'responsiblePersons' && key !== 'resources') {
  //         changes[key] = {
  //           from: currentActionPlan[key],
  //           to: req.body[key]
  //         };
  //       }
  //     });

  //     // Handle responsible persons changes
  //     if (req.body.responsiblePersons) {
  //       const currentPersonIds = currentActionPlan.responsiblePersons.map(rp => rp.user_id);
  //       const newPersonIds = req.body.responsiblePersons;
        
  //       const added = newPersonIds.filter(id => !currentPersonIds.includes(id));
  //       const removed = currentPersonIds.filter(id => !newPersonIds.includes(id));
        
  //       if (added.length > 0 || removed.length > 0) {
  //         changes.responsible_persons = {
  //           added,
  //           removed
  //         };
  //       }
  //     }

  //     // Handle resources changes
  //     if (req.body.resources) {
  //       const currentResourceIds = currentActionPlan.resources.map(r => r.resource_id);
  //       const newResourceIds = req.body.resources;
        
  //       const added = newResourceIds.filter(id => !currentResourceIds.includes(id));
  //       const removed = currentResourceIds.filter(id => !newResourceIds.includes(id));
        
  //       if (added.length > 0 || removed.length > 0) {
  //         changes.resources = {
  //           added,
  //           removed
  //         };
  //       }
  //     }

  //     // Create amendment history if there are changes
  //     if (Object.keys(changes).length > 0) {
  //       await ActionPlanAmendmentHistory.create({
  //         action_plan_id: req.params.id,
  //         amended_by_id: req.user.id,
  //         changes: JSON.stringify(changes)
  //       }, { transaction: t });
  //     }

  //     // Update relationships if needed
  //     if (req.body.responsiblePersons) {
  //       await ActionPlanResponsiblePerson.destroy({
  //         where: { action_plan_id: req.params.id },
  //         transaction: t
  //       });
        
  //       await ActionPlanResponsiblePerson.bulkCreate(
  //         req.body.responsiblePersons.map(userId => ({
  //           action_plan_id: req.params.id,
  //           user_id: userId
  //         })),
  //         { transaction: t }
  //       );
  //     }

  //     if (req.body.resources) {
  //       await ActionPlanResource.destroy({
  //         where: { action_plan_id: req.params.id },
  //         transaction: t
  //       });
        
  //       await ActionPlanResource.bulkCreate(
  //         req.body.resources.map(resourceId => ({
  //           action_plan_id: req.params.id,
  //           resource_id: resourceId
  //         })),
  //         { transaction: t }
  //       );
  //     }

  //     await t.commit();
      
  //     // Return the updated action plan
  //     req.include = this.include;
  //     return this.findById(req, res);
  //   } catch (error) {
  //     await t.rollback();
  //     res.status(400).json({ error: error.message });
  //   }
  // }

  async getAmendmentHistory(req, res) {
    try {
      const { id } = req.params;
      const history = await ActionPlanAmendmentHistory.findAll({
        where: { action_plan_id: id },
        include: [{ model: User, as: 'amendedBy', attributes: ['id', 'username', 'email', 'role'] }],
        order: [['amended_at', 'DESC']]
      });
      
      // Return empty array if no history found instead of 404
      res.json(history || []);
    } catch (error) {
      console.error('Error fetching amendment history:', error);
      res.status(500).json({ error: 'Error fetching amendment history.' });
    }
  }


async create(req, res) {
  const currentUser = req.user;
  const {
    audit_finding_id,
    action_plan: actionPlanText,
    timeline = '',
    due_date,
    resource_name = ''
  } = req.body;

  // Parse responsible_persons_ids - it might come as JSON string
  let responsible_persons_ids = [];
  try {
    if (req.body.responsible_persons_ids) {
      responsible_persons_ids = typeof req.body.responsible_persons_ids === 'string'
        ? JSON.parse(req.body.responsible_persons_ids)
        : req.body.responsible_persons_ids;
    }
  } catch (error) {
    console.error('Error parsing responsible_persons_ids:', error);
    responsible_persons_ids = [];
  }
  
  // Get files from multer - handling multiple files
  const resourceFiles = req.files?.resource_files || [];
  const evidenceFiles = req.files?.evidence_files || [];

  // Legacy single file support for backward compatibility
  const resourceFile = req.files?.resource?.[0] || null;
  const evidenceFile = req.files?.evidence?.[0] || null;

  if (!currentUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!audit_finding_id || !actionPlanText) {
    return res.status(400).json({ error: 'Audit Finding ID and action plan description are required.' });
  }

  try {
    // Use raw query to get the audit finding without trying to select non-existent columns
    const [auditFinding] = await sequelize.query(
      `SELECT 
        id, title, description, criteria, cause, impact, recommendation, 
        amount, risk_level_id, category_id, risk_rating_id, created_by_id, 
        status, rectification_id, vulnerability_id, compliance_gap_id, standard_id, 
        created_at, updated_at
      FROM audit_findings
      WHERE id = ?`,
      {
        replacements: [audit_finding_id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!auditFinding) {
      return res.status(404).json({ error: 'Audit Finding not found.' });
    }

    // Get assignment information from AuditFindingAssigned table
    const assignments = await AuditFindingAssigned.findAll({
      where: { finding_id: audit_finding_id },
      include: [
        {
          model: User,
          as: 'assignedToUser',
          attributes: ['id', 'username', 'email', 'role', 'department']
        },
        {
          model: User,
          as: 'assignedByUser',
          attributes: ['id', 'username', 'email', 'role']
        }
      ]
    });

    // Get audit finding creator information for department filtering
    const auditFindingCreator = await User.findByPk(auditFinding.created_by_id, {
      attributes: ['id', 'username', 'email', 'role', 'department']
    });

    if (!auditFindingCreator) {
      return res.status(404).json({ error: 'Audit Finding creator not found.' });
    }

    // Authorization Logic - Two-tier access control
    let isAuthorized = false;

    // Admin can always create action plans
    if (currentUser.role === 'Admin') {
      isAuthorized = true;
    } else {
      // Tier 1: Assigned Users (WITH Department Filtering)
      let isAssignedUser = false;
      if (assignments && assignments.length > 0) {
        const assignedUser = assignments.find(assignment =>
          assignment.assigned_to_id === currentUser.id
        );

        if (assignedUser && assignedUser.assignedToUser) {
          // Apply strict department filtering: assigned user's department must match creator's department
          if (assignedUser.assignedToUser.department === auditFindingCreator.department) {
            isAssignedUser = true;
          }
          if(auditFindingCreator.department === 'Inspection') {
            if (['Business', 'Inspection'].includes(assignedUser.assignedToUser.department)) {
              isAssignedUser = true;
            }
          }
          if(auditFindingCreator.department === 'Business') {
            if (['Business', 'Inspection'].includes(assignedUser.assignedToUser.department)) {
              isAssignedUser = true;
            }
          }
        }
      }

      // Tier 2: Responsible Persons (WITHOUT Department Filtering)
      let isResponsiblePerson = false;

      // Get all action plans for this audit finding
      const existingActionPlans = await ActionPlan.findAll({
        where: { audit_finding_id: audit_finding_id },
        attributes: ['action_plan_id']
      });

      if (existingActionPlans && existingActionPlans.length > 0) {
        const actionPlanIds = existingActionPlans.map(ap => ap.action_plan_id);

        // Check if current user is a responsible person in any of these action plans
        const responsiblePersonRecord = await ActionPlanResponsiblePerson.findOne({
          where: {
            action_plan_id: { [Op.in]: actionPlanIds },
            user_id: currentUser.id
          }
        });

        if (responsiblePersonRecord) {
          isResponsiblePerson = true;
        }
      }

      isAuthorized = isAssignedUser || isResponsiblePerson;
    }



    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Unauthorized to create action plan. You must be assigned to this audit finding (same department) or be a responsible person in an existing action plan for this finding.'
      });
    }

    // Process multiple resource files
    const createdResources = [];
    const resourceIds = [];

    // Handle multiple resource files
    if (resourceFiles && resourceFiles.length > 0) {
      for (const file of resourceFiles) {
        const resource = await Resource.create({
          file_path: file.path,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size
        });

        resourceIds.push(resource.id);
        createdResources.push({
          id: resource.id,
          file_name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size: file.size
        });
      }
    }

    // Legacy single resource file support
    if (resourceFile && resourceFiles.length === 0) {
      const resource = await Resource.create({
        file_path: resourceFile.path,
        file_name: resourceFile.originalname,
        file_type: resourceFile.mimetype,
        file_size: resourceFile.size
      });

      resourceIds.push(resource.id);
      createdResources.push({
        id: resource.id,
        file_name: resourceFile.originalname,
        file_path: resourceFile.path,
        file_type: resourceFile.mimetype,
        file_size: resourceFile.size
      });
    }

    // Process multiple evidence files
    const createdEvidences = [];
    const evidenceIds = [];

    // Handle multiple evidence files
    if (evidenceFiles && evidenceFiles.length > 0) {
      for (const file of evidenceFiles) {
        const evidence = await Evidence.create({
          file_path: file.path,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size
        });

        evidenceIds.push(evidence.id);
        createdEvidences.push({
          id: evidence.id,
          file_name: file.originalname,
          file_path: file.path,
          file_type: file.mimetype,
          file_size: file.size
        });
      }
    }

    // Legacy single evidence file support
    if (evidenceFile && evidenceFiles.length === 0) {
      const evidence = await Evidence.create({
        file_path: evidenceFile.path,
        file_name: evidenceFile.originalname,
        file_type: evidenceFile.mimetype,
        file_size: evidenceFile.size
      });

      evidenceIds.push(evidence.id);
      createdEvidences.push({
        id: evidence.id,
        file_name: evidenceFile.originalname,
        file_path: evidenceFile.path,
        file_type: evidenceFile.mimetype,
        file_size: evidenceFile.size
      });
    }

    // Create the ActionPlan record
    const actionPlan = await ActionPlan.create({
      submitted_by_id: currentUser.id,
      audit_finding_id,
      action_plan: actionPlanText,
      timeline,
      due_date: due_date ? new Date(due_date) : null,
      status: 'Pending'
    });

    // Create responsible persons associations
    if (responsible_persons_ids.length > 0) {
      await ActionPlanResponsiblePerson.bulkCreate(
        responsible_persons_ids.map(userId => ({
          action_plan_id: actionPlan.action_plan_id,
          user_id: userId
        }))
      );
    }

    // Create resource junction table records for multiple files
    if (resourceIds.length > 0) {
      for (let i = 0; i < resourceIds.length; i++) {
        const resourceId = resourceIds[i];
        const resourceData = createdResources[i];

        await ActionPlanResource.create({
          action_plan_id: actionPlan.action_plan_id,
          resource_id: resourceId,
          resource_name: resource_name || resourceData.file_name
        });
      }
    }

    // Create evidence junction table records for multiple files
    if (evidenceIds.length > 0) {
      for (let i = 0; i < evidenceIds.length; i++) {
        const evidenceId = evidenceIds[i];
        const evidenceData = createdEvidences[i];

        await ActionPlanEvidence.create({
          action_plan_id: actionPlan.action_plan_id,
          evidence_id: evidenceId,
          file_name: evidenceData.file_name,
          file_path: evidenceData.file_path,
          file_type: evidenceData.file_type
        });
      }
    }

    // Log the creation to ActionPlanAmendmentHistory
    await ActionPlanAmendmentHistory.create({
      id: require('uuid').v4(),
      action_plan_id: actionPlan.action_plan_id,
      amend_by_id: currentUser.id,
      action_plan: actionPlan.action_plan,
      responsible_persons_id: JSON.stringify(responsible_persons_ids),
      timeline: actionPlan.timeline,
      status: actionPlan.status,
      amended_at: new Date()
    });

    // Update the AuditFinding status if needed
    if (auditFinding.status === 'Pending') {
      await sequelize.query(
        `UPDATE audit_findings SET status = 'In_Progress' WHERE id = ?`,
        {
          replacements: [auditFinding.id],
          type: sequelize.QueryTypes.UPDATE
        }
      );

      // Log AuditFinding status change
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
        status: 'In_Progress',
        rectification_id: auditFinding.rectification_id
      });
    }

    res.status(201).json({
      message: 'Action Plan created successfully.',
      actionPlan,
      resources: createdResources,
      evidences: createdEvidences,
      resourceCount: createdResources.length,
      evidenceCount: createdEvidences.length
    });

  } catch (error) {
    console.error('Error creating Action Plan:', error);
    res.status(500).json({ error: 'Error creating Action Plan: ' + error.message });
  }
}


  async updateActionPlan(req, res) {
    const actionPlan = req.actionPlan;
    const currentUser = req.user;
    const {
      resource_name = '',
      ...updateData
    } = req.body;

    // Parse responsible_persons_ids - it might come as JSON string from multipart form
    let responsible_persons_ids = [];
    try {
      if (req.body.responsible_persons_ids) {
        responsible_persons_ids = typeof req.body.responsible_persons_ids === 'string'
          ? JSON.parse(req.body.responsible_persons_ids)
          : req.body.responsible_persons_ids;
      }
    } catch (error) {
      console.error('Error parsing responsible_persons_ids:', error);
      responsible_persons_ids = [];
    }

    // Get files from multer - handling multiple files
    const resourceFiles = req.files?.resource_files || [];
    const evidenceFiles = req.files?.evidence_files || [];

    // Legacy single file support for backward compatibility
    const resourceFile = req.files?.resource?.[0] || null;
    const evidenceFile = req.files?.evidence?.[0] || null;

    try {
      // Update the action plan basic details
      await sequelize.query(
        `UPDATE action_plans 
         SET 
           action_plan = ?,
           timeline = ?,
           status = ?
         WHERE action_plan_id = ?`,
        {
          replacements: [
            updateData.action_plan || actionPlan.action_plan,
            updateData.timeline || actionPlan.timeline,
            updateData.status || actionPlan.status,
            actionPlan.action_plan_id
          ],
          type: sequelize.QueryTypes.UPDATE
        }
      );

      // Update responsible persons
      if (responsible_persons_ids.length > 0) {
        await ActionPlanResponsiblePerson.destroy({
          where: { action_plan_id: actionPlan.action_plan_id }
        });

        await ActionPlanResponsiblePerson.bulkCreate(
          responsible_persons_ids.map(userId => ({
            action_plan_id: actionPlan.action_plan_id,
            user_id: userId
          }))
        );
      }

      // Handle multiple resource files upload
      const createdResources = [];

      // Process multiple resource files
      if (resourceFiles && resourceFiles.length > 0) {
        for (const file of resourceFiles) {
          const resource = await Resource.create({
            file_path: file.path,
            file_name: file.originalname,
            file_type: file.mimetype,
            file_size: file.size
          });

          createdResources.push({
            id: resource.id,
            file_name: file.originalname,
            file_path: file.path,
            file_type: file.mimetype,
            file_size: file.size
          });

          await ActionPlanResource.create({
            action_plan_id: actionPlan.action_plan_id,
            resource_id: resource.id,
            resource_name: resource_name || file.originalname
          });
        }
      }

      // Legacy single resource file support
      if (resourceFile && resourceFiles.length === 0) {
        const resource = await Resource.create({
          file_path: resourceFile.path,
          file_name: resourceFile.originalname,
          file_type: resourceFile.mimetype,
          file_size: resourceFile.size
        });

        createdResources.push({
          id: resource.id,
          file_name: resourceFile.originalname,
          file_path: resourceFile.path,
          file_type: resourceFile.mimetype,
          file_size: resourceFile.size
        });

        await ActionPlanResource.create({
          action_plan_id: actionPlan.action_plan_id,
          resource_id: resource.id,
          resource_name: resource_name || resourceFile.originalname
        });
      }

      // Handle multiple evidence files upload
      const createdEvidences = [];

      // Process multiple evidence files
      if (evidenceFiles && evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const evidence = await Evidence.create({
            file_path: file.path,
            file_name: file.originalname,
            file_type: file.mimetype,
            file_size: file.size
          });

          createdEvidences.push({
            id: evidence.id,
            file_name: file.originalname,
            file_path: file.path,
            file_type: file.mimetype,
            file_size: file.size
          });

          await ActionPlanEvidence.create({
            action_plan_id: actionPlan.action_plan_id,
            evidence_id: evidence.id,
            file_name: file.originalname,
            file_path: file.path,
            file_type: file.mimetype
          });
        }
      }

      // Legacy single evidence file support
      if (evidenceFile && evidenceFiles.length === 0) {
        const evidence = await Evidence.create({
          file_path: evidenceFile.path,
          file_name: evidenceFile.originalname,
          file_type: evidenceFile.mimetype,
          file_size: evidenceFile.size
        });

        createdEvidences.push({
          id: evidence.id,
          file_name: evidenceFile.originalname,
          file_path: evidenceFile.path,
          file_type: evidenceFile.mimetype,
          file_size: evidenceFile.size
        });

        await ActionPlanEvidence.create({
          action_plan_id: actionPlan.action_plan_id,
          evidence_id: evidence.id,
          file_name: evidenceFile.originalname,
          file_path: evidenceFile.path,
          file_type: evidenceFile.mimetype
        });
      }

      // Track changes for amendment history
      const changes = {};
      
      // Track basic field changes
      Object.keys(updateData).forEach(key => {
        if (actionPlan[key] !== updateData[key]) {
          changes[key] = {
            from: actionPlan[key],
            to: updateData[key]
          };
        }
      });

      // Create amendment history if there are changes
      if (Object.keys(changes).length > 0) {
        try {
          // Check if the changes column exists
          const historyData = {
            id: require('uuid').v4(),
            amend_by_id: currentUser.id,
            action_plan_id: actionPlan.action_plan_id,
            action_plan: updateData.action_plan || actionPlan.action_plan,
            responsible_persons_id: responsible_persons_ids.length > 0 ? JSON.stringify(responsible_persons_ids) : undefined,
            timeline: updateData.timeline || actionPlan.timeline,
            status: updateData.status || actionPlan.status,
            amended_at: new Date()
          };
          
          // Try to add changes if the column exists
          try {
            historyData.changes = JSON.stringify(changes);
            await ActionPlanAmendmentHistory.create(historyData);
          } catch (error) {
            // If there's an error with the changes column, try without it
            if (error.name === 'SequelizeDatabaseError' && 
                error.parent && 
                error.parent.code === 'ER_BAD_FIELD_ERROR' &&
                error.parent.sqlMessage.includes("Unknown column 'changes'")) {
              
              // Remove changes field and try again
              delete historyData.changes;
              await ActionPlanAmendmentHistory.create(historyData);
            } else {
              // If it's a different error, rethrow it
              throw error;
            }
          }
        } catch (error) {
          console.error('Error creating amendment history:', error);
          // Continue with the update even if history creation fails
        }
      }

      // Fetch the updated action plan with all associations
      const updatedActionPlan = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id,
          ap.progress_percentage, ap.progress_justification,
          ap.created_at, ap.updated_at
        FROM action_plans ap
        WHERE ap.action_plan_id = ?`,
        {
          replacements: [actionPlan.action_plan_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );

      // Load associations manually
      const submittedBy = await User.findByPk(updatedActionPlan.submitted_by_id, {
        attributes: ['id', 'username', 'email', 'role']
      });
      
      // Get audit finding without trying to select non-existent columns
      const auditFinding = await sequelize.query(
        `SELECT 
          id, title, description, criteria, cause, impact, recommendation, 
          amount, risk_level_id, category_id, risk_rating_id, created_by_id, 
          status, rectification_id, vulnerability_id, compliance_gap_id, standard_id, 
          created_at, updated_at
        FROM audit_findings
        WHERE id = ?`,
        {
          replacements: [updatedActionPlan.audit_finding_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      // Get assignments for this audit finding
      const assignments = await AuditFindingAssigned.findAll({
        where: { finding_id: updatedActionPlan.audit_finding_id },
        include: [
          { 
            model: User, 
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'role'] 
          },
          { 
            model: User, 
            as: 'assignedByUser',
            attributes: ['id', 'username', 'email', 'role'] 
          }
        ]
      });
      
      // Add assignments to audit finding
      auditFinding.AuditFindingAssigneds = assignments;
      
      const responsiblePersons = await ActionPlanResponsiblePerson.findAll({
        where: { action_plan_id: updatedActionPlan.action_plan_id },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'role'] }]
      });
      
      const resources = await ActionPlanResource.findAll({
        where: { action_plan_id: updatedActionPlan.action_plan_id }
      });
      
      const evidences = await ActionPlanEvidence.findAll({
        where: { action_plan_id: updatedActionPlan.action_plan_id }
      });

      // Combine all data
      const result = {
        ...updatedActionPlan,
        submittedBy,
        AuditFinding: auditFinding,
        responsiblePersons,
        resources,
        evidences
      };

      res.json({
        message: 'Action Plan updated successfully.',
        actionPlan: result,
        resources: createdResources,
        evidences: createdEvidences,
        resourceCount: createdResources.length,
        evidenceCount: createdEvidences.length
      });

    } catch (error) {
      console.error('Error updating Action Plan:', error);
      res.status(500).json({ error: 'Error updating Action Plan: ' + error.message });
    }
  }

  async updateActionPlanStatus(req, res) {
    const actionPlan = req.actionPlan;
    const currentUser = req.user;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    if (!['Pending', 'In_Progress', 'Completed', 'Overdue'].includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    try {
      const oldStatus = actionPlan.status;
      let finalStatus = newStatus;

      // Check if action plan is overdue
      if (actionPlan.timeline && new Date() > new Date(actionPlan.timeline) && finalStatus !== 'Completed') {
        finalStatus = 'Overdue';
      }

      // Update the action plan status using SQL query
      await sequelize.query(
        `UPDATE action_plans SET status = ? WHERE action_plan_id = ?`,
        {
          replacements: [finalStatus, actionPlan.action_plan_id],
          type: sequelize.QueryTypes.UPDATE
        }
      );

      // Get resource IDs and evidence IDs for history
      const resources = await ActionPlanResource.findAll({
        where: { action_plan_id: actionPlan.action_plan_id },
        attributes: ['resource_id']
      });
      
      const evidences = await ActionPlanEvidence.findAll({
        where: { action_plan_id: actionPlan.action_plan_id },
        attributes: ['evidence_id']
      });

      const responsiblePersons = await ActionPlanResponsiblePerson.findAll({
        where: { action_plan_id: actionPlan.action_plan_id },
        attributes: ['user_id']
      });

      // Get resource and evidence IDs for history
      const resourceIds = resources.map(r => r.resource_id);
      const evidenceIds = evidences.map(e => e.evidence_id);

      // Create amendment history
      await ActionPlanAmendmentHistory.create({
        id: require('uuid').v4(),
        amend_by_id: currentUser.id,
        action_plan_id: actionPlan.action_plan_id,
        action_plan: actionPlan.action_plan,
        responsible_persons_id: JSON.stringify(responsiblePersons.map(rp => rp.user_id)),
        timeline: actionPlan.timeline,
        status: finalStatus,
        amended_at: new Date()
      });

      // If status is changed to Completed, check if all action plans for this audit finding are completed
      if (newStatus === 'Completed') {
        const findingId = actionPlan.audit_finding_id;
        
        // Get all action plans for this audit finding
        const actionPlans = await sequelize.query(
          `SELECT status FROM action_plans WHERE audit_finding_id = ?`,
          {
            replacements: [findingId],
            type: sequelize.QueryTypes.SELECT
          }
        );

        const allActionPlansCompleted = actionPlans.every(ap => ap.status === 'Completed');

        if (allActionPlansCompleted) {
          // Get the audit finding without trying to select non-existent columns
          const relatedAuditFinding = await sequelize.query(
            `SELECT 
              id, title, description, criteria, cause, impact, recommendation, 
              amount, risk_level_id, category_id, risk_rating_id, created_by_id, 
              status, rectification_id, vulnerability_id, compliance_gap_id, standard_id
            FROM audit_findings
            WHERE id = ?`,
            {
              replacements: [findingId],
              type: sequelize.QueryTypes.SELECT,
              plain: true
            }
          );
          
          if (relatedAuditFinding) {
            // Update the audit finding status
            await sequelize.query(
              `UPDATE audit_findings SET status = 'Resolved' WHERE id = ?`,
              {
                replacements: [relatedAuditFinding.id],
                type: sequelize.QueryTypes.UPDATE
              }
            );

            // Log the audit finding status change
            await AuditAmendmentHistory.create({
              amend_by_id: currentUser.id,
              audit_finding_id: relatedAuditFinding.id,
              title: relatedAuditFinding.title,
              description: relatedAuditFinding.description,
              criteria: relatedAuditFinding.criteria,
              cause: relatedAuditFinding.cause,
              impact: relatedAuditFinding.impact,
              recommendation: relatedAuditFinding.recommendation,
              amount: relatedAuditFinding.amount,
              risk_level_id: relatedAuditFinding.risk_level_id,
              category_id: relatedAuditFinding.category_id,
              risk_rating_id: relatedAuditFinding.risk_rating_id,
              created_by_id: relatedAuditFinding.created_by_id,
              status: 'Resolved',
              rectification_id: relatedAuditFinding.rectification_id
            });
          }
        }
      }

      // Get the updated action plan
      const updatedActionPlan = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id,
          ap.progress_percentage, ap.progress_justification,
          ap.created_at, ap.updated_at
        FROM action_plans ap
        WHERE ap.action_plan_id = ?`,
        {
          replacements: [actionPlan.action_plan_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );

      res.json({
        message: `Action Plan status updated from ${oldStatus} to ${finalStatus}.`,
        actionPlan: updatedActionPlan
      });

    } catch (error) {
      console.error('Error updating Action Plan status:', error);
      res.status(500).json({ error: 'Error updating Action Plan status: ' + error.message });
    }
  }

  async updateActionPlanProgress(req, res) {
    const actionPlan = req.actionPlan;
    const currentUser = req.user;
    const { progress_percentage, progress_justification } = req.body;

    // Validation
    if (progress_percentage === undefined || progress_percentage === null) {
      return res.status(400).json({ error: 'Progress percentage is required.' });
    }

    if (progress_percentage < 0 || progress_percentage > 100) {
      return res.status(400).json({ error: 'Progress percentage must be between 0 and 100.' });
    }

    if (!progress_justification || progress_justification.trim() === '') {
      return res.status(400).json({ error: 'Progress justification is required.' });
    }

    try {
      const oldProgressPercentage = actionPlan.progress_percentage || 0;
      const oldProgressJustification = actionPlan.progress_justification || '';

      // Update the action plan progress
      await sequelize.query(
        `UPDATE action_plans
         SET progress_percentage = ?, progress_justification = ?, updated_at = NOW()
         WHERE action_plan_id = ?`,
        {
          replacements: [progress_percentage, progress_justification.trim(), actionPlan.action_plan_id],
          type: sequelize.QueryTypes.UPDATE
        }
      );

      // Get responsible persons for amendment history
      const responsiblePersons = await sequelize.query(
        `SELECT user_id FROM action_plan_responsible_persons WHERE action_plan_id = ?`,
        {
          replacements: [actionPlan.action_plan_id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Create amendment history record
      await ActionPlanAmendmentHistory.create({
        id: require('uuid').v4(),
        amend_by_id: currentUser.id,
        action_plan_id: actionPlan.action_plan_id,
        action_plan: actionPlan.action_plan,
        responsible_persons_id: JSON.stringify(responsiblePersons.map(rp => rp.user_id)),
        timeline: actionPlan.timeline,
        status: actionPlan.status,
        progress_percentage: progress_percentage,
        progress_justification: progress_justification.trim(),
        changes: JSON.stringify({
          progress_percentage: {
            old: oldProgressPercentage,
            new: progress_percentage
          },
          progress_justification: {
            old: oldProgressJustification,
            new: progress_justification.trim()
          }
        }),
        amended_at: new Date()
      });

      // Get updated action plan
      const updatedActionPlan = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id, ap.progress_percentage,
          ap.progress_justification, ap.created_at, ap.updated_at,
          u.username as submitted_by_username
        FROM action_plans ap
        LEFT JOIN users u ON ap.submitted_by_id = u.id
        WHERE ap.action_plan_id = ?`,
        {
          replacements: [actionPlan.action_plan_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );

      res.json({
        message: `Action Plan progress updated from ${oldProgressPercentage}% to ${progress_percentage}%.`,
        actionPlan: updatedActionPlan
      });

    } catch (error) {
      console.error('Error updating Action Plan progress:', error);
      res.status(500).json({ error: 'Error updating Action Plan progress: ' + error.message });
    }
  }

  async findAll(req, res) {
    try {
      // First, try to check if the table exists
      const tableExists = await sequelize.query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'action_plans'`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (tableExists[0].count === 0) {
        // Table doesn't exist, return empty array
        console.log('Action plans table does not exist');
        return res.json([]);
      }

      // Use raw query to avoid Sequelize trying to select removed columns
      const actionPlans = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id,
          ap.progress_percentage, ap.progress_justification,
          ap.created_at, ap.updated_at
        FROM action_plans ap
        ORDER BY ap.created_at DESC`,
        {
          type: sequelize.QueryTypes.SELECT
        }
      );

      // If no action plans exist, return empty array
      if (!actionPlans || actionPlans.length === 0) {
        return res.json([]);
      }

      // Load associations for each action plan with error handling
      const result = await Promise.all(actionPlans.map(async (plan) => {
        try {
          const submittedBy = await User.findByPk(plan.submitted_by_id, {
            attributes: ['id', 'username', 'email', 'role']
          });

          let auditFinding = null;
          try {
            auditFinding = await AuditFinding.findByPk(plan.audit_finding_id, {
              attributes: ['id', 'title', 'description', 'status', 'amount', 'created_at']
            });
          } catch (findingError) {
            console.error('Error loading audit finding:', findingError);
          }

          let responsiblePersons = [];
          try {
            responsiblePersons = await ActionPlanResponsiblePerson.findAll({
              where: { action_plan_id: plan.action_plan_id },
              include: [{ model: User, attributes: ['id', 'username', 'email', 'role'] }]
            });
          } catch (rpError) {
            console.error('Error loading responsible persons:', rpError);
          }

          let resources = [];
          try {
            resources = await sequelize.query(
              `SELECT
                apr.resource_id as id, apr.action_plan_id, apr.resource_id, apr.resource_name,
                r.file_path, r.file_path as file_name, r.file_type, r.file_size,
                apr.created_at, apr.updated_at
              FROM action_plan_resources apr
              LEFT JOIN resources r ON apr.resource_id = r.id
              WHERE apr.action_plan_id = ?`,
              {
                replacements: [plan.action_plan_id],
                type: sequelize.QueryTypes.SELECT
              }
            );
          } catch (resourceError) {
            console.error('Error loading resources:', resourceError);
          }

          let evidences = [];
          try {
            evidences = await sequelize.query(
              `SELECT
                ape.evidence_id as id, ape.action_plan_id, ape.evidence_id,
                ape.file_name, ape.file_path, ape.file_type,
                ape.created_at, ape.updated_at
              FROM action_plan_evidences ape
              WHERE ape.action_plan_id = ?`,
              {
                replacements: [plan.action_plan_id],
                type: sequelize.QueryTypes.SELECT
              }
            );
          } catch (evidenceError) {
            console.error('Error loading evidences:', evidenceError);
          }

          return {
            ...plan,
            submittedBy,
            AuditFinding: auditFinding,
            responsiblePersons,
            resources,
            evidences
          };
        } catch (planError) {
          console.error('Error processing action plan:', planError);
          return {
            ...plan,
            submittedBy: null,
            AuditFinding: null,
            responsiblePersons: [],
            resources: [],
            evidences: []
          };
        }
      }));

      res.json(result);
    } catch (error) {
      console.error('Error fetching action plans:', error);
      // Return empty array instead of error to prevent frontend crash
      res.json([]);
    }
  }

  async findById(req, res) {
    try {
      const { id } = req.params;
      
      // Use raw query to avoid Sequelize trying to select removed columns
      const actionPlan = await sequelize.query(
        `SELECT
          ap.action_plan_id, ap.audit_finding_id, ap.action_plan,
          ap.timeline, ap.status, ap.submitted_by_id,
          ap.progress_percentage, ap.progress_justification,
          ap.created_at, ap.updated_at
        FROM action_plans ap
        WHERE ap.action_plan_id = ?`,
        {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );

      if (!actionPlan) {
        return res.status(404).json({ error: 'Action Plan not found.' });
      }

      // Load associations manually
      const submittedBy = await User.findByPk(actionPlan.submitted_by_id, {
        attributes: ['id', 'username', 'email', 'role']
      });
      
      // Get audit finding without trying to select non-existent columns
      const auditFinding = await sequelize.query(
        `SELECT 
          id, title, description, criteria, cause, impact, recommendation, 
          amount, risk_level_id, category_id, risk_rating_id, created_by_id, 
          status, rectification_id, vulnerability_id, compliance_gap_id, standard_id, 
          created_at, updated_at
        FROM audit_findings
        WHERE id = ?`,
        {
          replacements: [actionPlan.audit_finding_id],
          type: sequelize.QueryTypes.SELECT,
          plain: true
        }
      );
      
      // Get assignments for this audit finding
      const assignments = await AuditFindingAssigned.findAll({
        where: { finding_id: actionPlan.audit_finding_id },
        include: [
          { 
            model: User, 
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'role'] 
          },
          { 
            model: User, 
            as: 'assignedByUser',
            attributes: ['id', 'username', 'email', 'role'] 
          }
        ]
      });
      
      // Add assignments to audit finding
      auditFinding.AuditFindingAssigneds = assignments;
      
      const responsiblePersons = await ActionPlanResponsiblePerson.findAll({
        where: { action_plan_id: actionPlan.action_plan_id },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'role'] }]
      });
      
      // Get resources - Join with resources table to get file information
      let resources = [];
      try {
        resources = await sequelize.query(
          `SELECT
            apr.resource_id as id,
            apr.action_plan_id,
            apr.resource_name,
            COALESCE(r.file_name, apr.resource_name) as file_name,
            r.file_type,
            r.file_path,
            r.file_size,
            apr.created_at,
            apr.updated_at
          FROM action_plan_resources apr
          LEFT JOIN resources r ON apr.resource_id = r.id
          WHERE apr.action_plan_id = ?`,
          {
            replacements: [actionPlan.action_plan_id],
            type: sequelize.QueryTypes.SELECT
          }
        );

      } catch (resourceError) {
        console.error('Error loading resources:', resourceError);
        resources = [];
      }

      // Get evidences with file information
      let evidences = [];
      try {
        evidences = await sequelize.query(
          `SELECT
            ape.evidence_id as id,
            ape.action_plan_id,
            ape.evidence_id,
            ape.file_name,
            ape.file_path,
            ape.file_type,
            NULL as file_size,
            ape.created_at,
            ape.updated_at
          FROM action_plan_evidences ape
          WHERE ape.action_plan_id = ?`,
          {
            replacements: [actionPlan.action_plan_id],
            type: sequelize.QueryTypes.SELECT
          }
        );

      } catch (evidenceError) {
        console.error('Error loading evidences:', evidenceError);
        evidences = [];
      }
      
      let amendmentHistory = [];
      try {
        amendmentHistory = await ActionPlanAmendmentHistory.findAll({
          where: { action_plan_id: actionPlan.action_plan_id },
          include: [{ model: User, as: 'amendedBy', attributes: ['id', 'username', 'email'] }],
          order: [['amended_at', 'DESC']]
        });
      } catch (historyError) {
        console.error('Error loading amendment history:', historyError);
        amendmentHistory = [];
      }

      // Check if action plan is overdue
      if (actionPlan.status !== 'Completed' && actionPlan.timeline && new Date() > new Date(actionPlan.timeline)) {
        actionPlan.status = 'Overdue';
      }

      // Combine all data
      const result = {
        ...actionPlan,
        submittedBy,
        AuditFinding: auditFinding,
        responsiblePersons,
        resources,
        evidences,
        amendmentHistory
      };

      res.json(result);
    } catch (error) {
      console.error('Error fetching action plan by ID:', error);
      res.status(500).json({ error: 'Error fetching action plan.' });
    }
  }

  // Download evidence file
  async downloadEvidence(req, res) {
    try {
      const { evidenceId } = req.params;

      // Find the evidence record
      const evidence = await Evidence.findByPk(evidenceId);

      if (!evidence) {
        return res.status(404).json({ error: 'Evidence file not found' });
      }

      // Check if user has access to this evidence through action plan
      const actionPlanEvidence = await ActionPlanEvidence.findOne({
        where: { evidence_id: evidenceId },
        include: [{
          model: ActionPlan,
          as: 'ActionPlan',
          include: [{
            model: AuditFinding,
            as: 'AuditFinding'
          }]
        }]
      });

      if (!actionPlanEvidence) {
        return res.status(404).json({ error: 'Evidence file not associated with any action plan' });
      }

      // Check file exists on disk
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(evidence.file_path)) {
        return res.status(404).json({ error: 'Evidence file not found on server' });
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${evidence.file_name}"`);
      res.setHeader('Content-Type', evidence.file_type || 'application/octet-stream');

      // Send the file
      res.sendFile(path.resolve(evidence.file_path));

    } catch (error) {
      console.error('Error downloading evidence:', error);
      res.status(500).json({ error: 'Failed to download evidence file' });
    }
  }

  // Download resource file
  async downloadResource(req, res) {
    try {
      const { resourceId } = req.params;

      // Find the resource record
      const resource = await Resource.findByPk(resourceId);

      if (!resource) {
        return res.status(404).json({ error: 'Resource file not found' });
      }

      // Check if user has access to this resource through action plan
      const actionPlanResource = await ActionPlanResource.findOne({
        where: { resource_id: resourceId },
        include: [{
          model: ActionPlan,
          as: 'ActionPlan',
          include: [{
            model: AuditFinding,
            as: 'AuditFinding'
          }]
        }]
      });

      if (!actionPlanResource) {
        return res.status(404).json({ error: 'Resource file not associated with any action plan' });
      }

      // Check file exists on disk
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(resource.file_path)) {
        return res.status(404).json({ error: 'Resource file not found on server' });
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${resource.file_name}"`);
      res.setHeader('Content-Type', resource.file_type || 'application/octet-stream');

      // Send the file
      res.sendFile(path.resolve(resource.file_path));

    } catch (error) {
      console.error('Error downloading resource:', error);
      res.status(500).json({ error: 'Failed to download resource file' });
    }
  }
}

module.exports = new ActionPlanController();
