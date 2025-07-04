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
  Resource
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
      const actionPlan = await ActionPlan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'submittedBy',
            attributes: ['id', 'role', 'department']
          },
          {
            model: AuditFinding,
            include: [
              {
                model: AuditFindingAssigned,
                as: 'AuditFindingAssigneds',
                attributes: ['assigned_to_id'],
                include: [{ model: User, as: 'assignedToUser', attributes: ['id'] }]
              }
            ]
          },
          {
            model: ActionPlanResponsiblePerson,
            as: 'responsiblePersons',
            attributes: ['user_id'],
            include: [{ model: User, attributes: ['id'] }]
          }
        ]
      });

      if (!actionPlan) {
        return res.status(404).json({ error: 'Action Plan not found.' });
      }

      const submittedByUser = actionPlan.submittedBy;
      const currentUserIsSubmittedBy = (currentUser.id === submittedByUser.id);
      const currentUserIsResponsiblePerson = actionPlan.responsiblePersons.some(
        rp => rp.user_id === currentUser.id
      );
      const currentUserIsAssignedToFinding = actionPlan.AuditFinding.AuditFindingAssigneds.some(
        afa => afa.assigned_to_id === currentUser.id
      );

      let isSupervisorOrDirector = false;
      if (submittedByUser) {
        const currentRole = currentUser.role;
        const currentDepartment = currentUser.department;
        const submittedByDepartment = submittedByUser.department;
        const submittedByRole = submittedByUser.role;

        switch (submittedByRole) {
          case 'Resident_Auditors':
            if (submittedByDepartment === 'Business' && currentDepartment === 'Business' &&
                ['Audit_Supervisor', 'Audit_Director'].includes(currentRole)) {
              isSupervisorOrDirector = true;
            }
            break;
          case 'IT_Auditors':
            if (submittedByDepartment === 'IT_Audit' && currentDepartment === 'IT_Audit' &&
                ['IT_Auditors_Supervisor', 'IT_Auditors_Director'].includes(currentRole)) {
              isSupervisorOrDirector = true;
            }
            break;
          case 'Inspection_Auditors':
            if (submittedByDepartment === 'Inspection' && currentDepartment === 'Inspection' &&
                ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'].includes(currentRole)) {
              isSupervisorOrDirector = true;
            }
            break;
          default:
            break;
        }
      }

      const isAuthorized = currentUserIsSubmittedBy ||
                           currentUserIsAssignedToFinding ||
                           currentUserIsResponsiblePerson ||
                           isSupervisorOrDirector ||
                           currentUser.role === 'Admin';

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized to access/modify this Action Plan.' });
      }

      req.actionPlan = actionPlan;
      next();

    } catch (error) {
      console.error('Error in authorizeActionPlanAccess:', error);
      res.status(500).json({ error: 'Internal server error during Action Plan authorization.' });
    }
  }

  async authorizeActionPlanStatusChange(req, res, next) {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const actionPlan = await ActionPlan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'submittedBy',
            attributes: ['id', 'role', 'department']
          },
          {
            model: AuditFinding,
            include: [
              {
                model: AuditFindingAssigned,
                as: 'AuditFindingAssigneds',
                attributes: ['assigned_to_id'],
                include: [{ model: User, as: 'assignedToUser', attributes: ['id'] }]
              }
            ]
          },
          {
            model: ActionPlanResponsiblePerson,
            as: 'responsiblePersons',
            attributes: ['user_id'],
            include: [{ model: User, attributes: ['id'] }]
          }
        ]
      });

      if (!actionPlan) {
        return res.status(404).json({ error: 'Action Plan not found.' });
      }

      const submittedByUser = actionPlan.submittedBy;
      const currentUserIsSubmittedBy = (currentUser.id === submittedByUser.id);
      const currentUserIsResponsiblePerson = actionPlan.responsiblePersons.some(
        rp => rp.user_id === currentUser.id
      );
      const currentUserIsAssignedToFinding = actionPlan.AuditFinding.AuditFindingAssigneds.some(
        afa => afa.assigned_to_id === currentUser.id
      );

      let isSupervisorOrDirector = false;
      if (submittedByUser) {
        const currentRole = currentUser.role;
        const currentDepartment = currentUser.department;
        const submittedByDepartment = submittedByUser.department;
        const submittedByRole = submittedByUser.role;

        switch (submittedByRole) {
          case 'Resident_Auditors':
            if (submittedByDepartment === 'Business' && currentDepartment === 'Business' &&
                ['Audit_Supervisor', 'Audit_Director'].includes(currentRole)) {
              isSupervisorOrDirector = true;
            }
            break;
          case 'IT_Auditors':
            if (submittedByDepartment === 'IT_Audit' && currentDepartment === 'IT_Audit' &&
                ['IT_Auditors_Supervisor', 'IT_Auditors_Director'].includes(currentRole)) {
              isSupervisorOrDirector = true;
            }
            break;
          case 'Inspection_Auditors':
            if (submittedByDepartment === 'Inspection' && currentDepartment === 'Inspection' &&
                ['Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director'].includes(currentRole)) {
              isSupervisorOrDirector = true;
            }
            break;
          default:
            break;
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

  async update(req, res) {
    const t = await this.model.sequelize.transaction();
    try {
      // Get current state
      const currentActionPlan = await this.model.findByPk(req.params.id, { 
        include: [ActionPlanResponsiblePerson, ActionPlanResource],
        transaction: t 
      });

      // Update the action plan
      const [updated] = await this.model.update(req.body, {
        where: { id: req.params.id },
        transaction: t
      });

      if (!updated) {
        await t.rollback();
        return res.status(404).json({ error: 'Not found' });
      }

      // Track changes
      const changes = {};
      Object.keys(req.body).forEach(key => {
        if (currentActionPlan[key] !== req.body[key] && key !== 'responsiblePersons' && key !== 'resources') {
          changes[key] = {
            from: currentActionPlan[key],
            to: req.body[key]
          };
        }
      });

      // Handle responsible persons changes
      if (req.body.responsiblePersons) {
        const currentPersonIds = currentActionPlan.responsiblePersons.map(rp => rp.user_id);
        const newPersonIds = req.body.responsiblePersons;
        
        const added = newPersonIds.filter(id => !currentPersonIds.includes(id));
        const removed = currentPersonIds.filter(id => !newPersonIds.includes(id));
        
        if (added.length > 0 || removed.length > 0) {
          changes.responsible_persons = {
            added,
            removed
          };
        }
      }

      // Handle resources changes
      if (req.body.resources) {
        const currentResourceIds = currentActionPlan.resources.map(r => r.resource_id);
        const newResourceIds = req.body.resources;
        
        const added = newResourceIds.filter(id => !currentResourceIds.includes(id));
        const removed = currentResourceIds.filter(id => !newResourceIds.includes(id));
        
        if (added.length > 0 || removed.length > 0) {
          changes.resources = {
            added,
            removed
          };
        }
      }

      // Create amendment history if there are changes
      if (Object.keys(changes).length > 0) {
        await ActionPlanAmendmentHistory.create({
          action_plan_id: req.params.id,
          amended_by_id: req.user.id,
          changes: JSON.stringify(changes)
        }, { transaction: t });
      }

      // Update relationships if needed
      if (req.body.responsiblePersons) {
        await ActionPlanResponsiblePerson.destroy({
          where: { action_plan_id: req.params.id },
          transaction: t
        });
        
        await ActionPlanResponsiblePerson.bulkCreate(
          req.body.responsiblePersons.map(userId => ({
            action_plan_id: req.params.id,
            user_id: userId
          })),
          { transaction: t }
        );
      }

      if (req.body.resources) {
        await ActionPlanResource.destroy({
          where: { action_plan_id: req.params.id },
          transaction: t
        });
        
        await ActionPlanResource.bulkCreate(
          req.body.resources.map(resourceId => ({
            action_plan_id: req.params.id,
            resource_id: resourceId
          })),
          { transaction: t }
        );
      }

      await t.commit();
      
      // Return the updated action plan
      req.include = this.include;
      return this.findById(req, res);
    } catch (error) {
      await t.rollback();
      res.status(400).json({ error: error.message });
    }
  }

  async getAmendmentHistory(req, res) {
    try {
      const history = await ActionPlanAmendmentHistory.findAll({
        where: { action_plan_id: req.params.id },
        include: [{ model: User, as: 'amendedBy' }],
        order: [['createdAt', 'DESC']]
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }


async create(req, res) {
  const currentUser = req.user;
  const {
    audit_finding_id,
    action_plan: actionPlanText,
    timeline,
    responsible_persons_ids = [],
    resource_ids = [],
    evidence_files = []
  } = req.body;

  if (!currentUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!audit_finding_id || !actionPlanText || !timeline) {
    return res.status(400).json({ error: 'Audit Finding ID, action plan description, and timeline are required.' });
  }

  try {
    // 1. Verify if the current user is assigned to the Audit Finding OR it's escalated to them
    const auditFinding = await AuditFinding.findByPk(audit_finding_id, {
      include: [
        {
          model: AuditFindingAssigned,
          as: 'AuditFindingAssigneds',
          where: { assigned_to_id: currentUser.id },
          required: false
        },
        {
          model: AuditFindingEscalation,
          as: 'AuditFindingEscalations',
          where: { escalated_to_id: currentUser.id },
          required: false
        }
      ]
    });

    if (!auditFinding) {
      return res.status(404).json({ error: 'Audit Finding not found.' });
    }

    const isAssigned = auditFinding.AuditFindingAssigneds && auditFinding.AuditFindingAssigneds.length > 0;
    const isEscalatedToCurrentUser = auditFinding.AuditFindingEscalations && auditFinding.AuditFindingEscalations.some(
      esc => esc.escalated_to_id === currentUser.id
    );

    const supervisorRoles = [
      'Auditee_Supervisor', 'Auditee_Super_Supervisor',
      'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor',
      'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor',
    ];

    let isAuthorizedToCreateAP = false;

    // Authorization Logic (Correctly placed BEFORE any database writes for ActionPlan)
    if (isAssigned && !supervisorRoles.includes(currentUser.role)) {
        isAuthorizedToCreateAP = true;
    } else if (supervisorRoles.includes(currentUser.role) && isEscalatedToCurrentUser) {
        isAuthorizedToCreateAP = true;
    } else if (currentUser.role === 'Admin') {
        isAuthorizedToCreateAP = true;
    }

    if (!isAuthorizedToCreateAP) {
      return res.status(403).json({ error: 'You are not authorized to create an Action Plan for this Audit Finding.' });
    }

    // --- Database Write Operations begin AFTER successful authorization ---

    // 2. Create the ActionPlan record
    const actionPlan = await ActionPlan.create({
      submitted_by_id: currentUser.id,
      audit_finding_id,
      action_plan: actionPlanText,
      timeline,
      status: 'Pending'
    });

    // 3. Create associated ActionPlanResponsiblePerson records
    if (responsible_persons_ids.length > 0) {
      const responsiblePersons = responsible_persons_ids.map(userId => ({
        action_plan_id: actionPlan.id,
        user_id: userId
      }));
      await ActionPlanResponsiblePerson.bulkCreate(responsiblePersons);
    }

    // 4. Create associated ActionPlanResource records
    if (resource_ids.length > 0) {
      const resources = resource_ids.map(resourceId => ({
        action_plan_id: actionPlan.id,
        resource_id: resourceId
      }));
      await ActionPlanResource.bulkCreate(resources);
    }

    // 5. Create associated ActionPlanEvidence records
    if (evidence_files.length > 0) {
      const evidences = evidence_files.map(file => ({
        action_plan_id: actionPlan.id,
        evidence_url: file.evidence_url,
        file_name: file.file_name,
        file_type: file.file_type
      }));
      await ActionPlanEvidence.bulkCreate(evidences);
    }

    // 6. Log the creation to ActionPlanAmendmentHistory
    await ActionPlanAmendmentHistory.create({
      amend_by_id: currentUser.id,
      action_plan_id: actionPlan.id,
      action_plan: actionPlan.action_plan,
      responsible_persons_id: responsible_persons_ids,
      timeline: actionPlan.timeline,
      resourse_id: resource_ids,
      evidence_id: evidence_files.map(f => f.file_name),
      status: actionPlan.status,
    });

    // 7. Update the parent AuditFinding's status to 'In_Progress'
    if (auditFinding.status === 'Pending') {
        auditFinding.status = 'In_Progress';
        await auditFinding.save();

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
          status: auditFinding.status,
          rectification_id: auditFinding.rectification_id,
        });
    }

    res.status(201).json({
      message: 'Action Plan created successfully.',
      actionPlan
    });

  } catch (error) {
    console.error('Error creating Action Plan:', error);
    res.status(500).json({ error: 'Error creating Action Plan.' });
  }
}



  async updateActionPlan(req, res) {
    const actionPlan = req.actionPlan;
    const currentUser = req.user;
    const { responsible_persons_ids = [], resource_ids = [], evidence_files = [], ...updateData } = req.body;

    try {
      const originalResponsiblePersons = await ActionPlanResponsiblePerson.findAll({
          where: { action_plan_id: actionPlan.id },
          attributes: ['user_id']
      });
      const originalResourceIds = await ActionPlanResource.findAll({
          where: { action_plan_id: actionPlan.id },
          attributes: ['resource_id']
      });
      const originalEvidenceIds = await ActionPlanEvidence.findAll({
          where: { action_plan_id: actionPlan.id },
          attributes: ['file_name']
      });

      await actionPlan.update(updateData);

      if (responsible_persons_ids.length > 0) {
          await ActionPlanResponsiblePerson.destroy({ where: { action_plan_id: actionPlan.id } });
          const newResponsiblePersons = responsible_persons_ids.map(userId => ({
              action_plan_id: actionPlan.id,
              user_id: userId
          }));
          await ActionPlanResponsiblePerson.bulkCreate(newResponsiblePersons);
      }

      if (resource_ids.length > 0) {
          await ActionPlanResource.destroy({ where: { action_plan_id: actionPlan.id } });
          const newResources = resource_ids.map(resourceId => ({
              action_plan_id: actionPlan.id,
              resource_id: resourceId
          }));
          await ActionPlanResource.bulkCreate(newResources);
      }

      if (evidence_files.length > 0) {
          await ActionPlanEvidence.destroy({ where: { action_plan_id: actionPlan.id } });
          const newEvidences = evidence_files.map(file => ({
              action_plan_id: actionPlan.id,
              evidence_url: file.evidence_url,
              file_name: file.file_name,
              file_type: file.file_type
          }));
          await ActionPlanEvidence.bulkCreate(newEvidences);
      }

      await ActionPlanAmendmentHistory.create({
        amend_by_id: currentUser.id,
        action_plan_id: actionPlan.id,
        action_plan: actionPlan.action_plan,
        responsible_persons_id: responsible_persons_ids,
        timeline: actionPlan.timeline,
        resourse_id: resource_ids,
        evidence_id: evidence_files.map(f => f.file_name),
        status: actionPlan.status,
      });

      res.json({
        message: 'Action Plan updated successfully.',
        actionPlan
      });

    } catch (error) {
      console.error('Error updating Action Plan:', error);
      res.status(500).json({ error: 'Error updating Action Plan.' });
    }
  }

  async updateActionPlanStatus(req, res) {
    const actionPlan = req.actionPlan;
    const currentUser = req.user;
    const { status: newStatus } = req.body;

    const validStatuses = ['Pending', 'In_Progress', 'Completed'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status provided. Allowed statuses are: Pending, In_Progress, Completed.' });
    }

    if (newStatus === 'In_Progress' && actionPlan.status !== 'Pending') {
      return res.status(400).json({ error: 'Action Plan can only go to In_Progress from Pending status.' });
    }
    if (newStatus === 'Completed' && actionPlan.status !== 'In_Progress') {
      return res.status(400).json({ error: 'Action Plan can only go to Completed from In_Progress status.' });
    }
    if (newStatus === 'Pending' && actionPlan.status !== 'Overdue') {
      return res.status(400).json({ error: 'Action Plan can only go back to Pending from Overdue status.' });
    }
    if (actionPlan.status === 'Completed' || actionPlan.status === 'Overdue') {
        return res.status(400).json({ error: `Cannot change status from ${actionPlan.status}.` });
    }

    try {
      const oldStatus = actionPlan.status;
      actionPlan.status = newStatus;

      if (actionPlan.timeline && new Date() > new Date(actionPlan.timeline) && actionPlan.status !== 'Completed') {
        actionPlan.status = 'Overdue';
      }

      await actionPlan.save();

      await ActionPlanAmendmentHistory.create({
        amend_by_id: currentUser.id,
        action_plan_id: actionPlan.id,
        action_plan: actionPlan.action_plan,
        responsible_persons_id: (await actionPlan.getResponsiblePersons({ attributes: ['user_id'] })).map(rp => rp.user_id),
        timeline: actionPlan.timeline,
        resourse_id: (await actionPlan.getResources({ attributes: ['resource_id'] })).map(r => r.resource_id),
        evidence_id: (await actionPlan.getEvidences({ attributes: ['file_name'] })).map(e => e.file_name),
        status: actionPlan.status,
      });

      res.json({
        message: `Action Plan status updated from ${oldStatus} to ${newStatus}.`,
        actionPlan
      });

    } catch (error) {
      console.error('Error updating Action Plan status:', error);
      res.status(500).json({ error: 'Error updating Action Plan status.' });
    }
  }

  async findAll(req, res) {
    try {
      const { page = 1, limit = 10, search, status, audit_finding_id, submitted_by_id } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;
      if (audit_finding_id) where.audit_finding_id = audit_finding_id;
      if (submitted_by_id) where.submitted_by_id = submitted_by_id;

      if (search) {
        where[Op.or] = [
          { action_plan: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows } = await ActionPlan.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'submittedBy', attributes: ['id', 'username', 'email', 'role', 'department'] },
          { model: AuditFinding, attributes: ['id', 'title'] },
          {
            model: ActionPlanResponsiblePerson,
            as: 'responsiblePersons',
            attributes: ['user_id'],
            include: [{ model: User, attributes: ['id', 'username', 'email', 'role', 'department'] }]
          },
          {
            model: ActionPlanResource,
            as: 'resources',
            attributes: ['resource_id'],
            include: [{ model: Resource, attributes: ['id', 'name', 'description'] }]
          },
          { model: ActionPlanEvidence, as: 'evidences' },
          {
            model: ActionPlanAmendmentHistory,
            as: 'actionPlanAmendmentHistories',
            include: [{ model: User, as: 'amendedBy', attributes: ['id', 'username', 'email'] }],
            order: [['created_at', 'DESC']]
          }
        ]
      });

      rows.forEach(actionPlan => {
        if (actionPlan.status !== 'Completed' && actionPlan.timeline && new Date() > new Date(actionPlan.timeline)) {
          actionPlan.status = 'Overdue';
        }
      });

      res.json({
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });

    } catch (error) {
      console.error('Error fetching action plans:', error);
      res.status(500).json({ error: 'Error fetching action plans.' });
    }
  }

  async findById(req, res) {
    try {
      const { id } = req.params;
      const actionPlan = await ActionPlan.findByPk(id, {
        include: [
          { model: User, as: 'submittedBy', attributes: ['id', 'username', 'email', 'role', 'department'] },
          { model: AuditFinding, attributes: ['id', 'title'] },
          {
            model: ActionPlanResponsiblePerson,
            as: 'responsiblePersons',
            attributes: ['user_id'],
            include: [{ model: User, attributes: ['id', 'username', 'email', 'role', 'department'] }]
          },
          {
            model: ActionPlanResource,
            as: 'resources',
            attributes: ['resource_id'],
            include: [{ model: Resource, attributes: ['id', 'name', 'description'] }]
          },
          { model: ActionPlanEvidence, as: 'evidences' },
          {
            model: ActionPlanAmendmentHistory,
            as: 'actionPlanAmendmentHistories',
            include: [{ model: User, as: 'amendedBy', attributes: ['id', 'username', 'email'] }],
            order: [['created_at', 'DESC']]
          }
        ]
      });

      if (!actionPlan) {
        return res.status(404).json({ error: 'Action Plan not found.' });
      }

      if (actionPlan.status !== 'Completed' && actionPlan.timeline && new Date() > new Date(actionPlan.timeline)) {
        actionPlan.status = 'Overdue';
      }

      res.json(actionPlan);
    } catch (error) {
      console.error('Error fetching action plan by ID:', error);
      res.status(500).json({ error: 'Error fetching action plan.' });
    }
  }
}

module.exports = new ActionPlanController();