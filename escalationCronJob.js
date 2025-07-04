const cron = require('node-cron');
const { AuditFinding, User, AuditFindingEscalation, AuditAmendmentHistory } = require('./models'); // Adjust path as needed
const UserService = require('./services/userService'); // Adjust path as needed
const { Op } = require('sequelize');

// Define escalation thresholds in days
const FIRST_ESCALATION_DAYS = 15;
const SECOND_ESCALATION_DAYS = 30; // Total days from creation

// Roles involved in escalation
const ESCALATION_ROLES_MAP = {
  'Business': {
    level1: 'Auditee_Supervisor',
    level2: 'Auditee_Super_Supervisor'
  },
  'IT_Audit': {
    level1: 'IT_Auditees_Supervisor',
    level2: 'IT_Auditees_Super_Supervisor'
  },
  'Inspection': {
    level1: 'Inspection_Auditees_Supervisor',
    level2: 'Inspection_Auditees_Super_Supervisor'
  }
};

const escalateAuditFindings = async () => {
  console.log('Running audit finding escalation cron job...');
  try {
    const now = new Date();

    // Find audit findings that are not yet resolved or already escalated to level 2
    const findingsToEscalate = await AuditFinding.findAll({
      where: {
        status: {
          [Op.notIn]: ['Resolved'] // Don't escalate resolved findings
        }
      },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'department', 'role'] // Need creator's department and ID
        },
        {
          model: AuditFindingEscalation,
          as: 'AuditFindingEscalations',
          required: false // Include even if no escalations yet
        }
      ]
    });

    for (const finding of findingsToEscalate) {
      const createdAt = new Date(finding.created_at);
      const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      const creatorDepartment = finding.createdBy ? finding.createdBy.department : null;

      if (!creatorDepartment || !ESCALATION_ROLES_MAP[creatorDepartment]) {
        console.warn(`Skipping escalation for AuditFinding ${finding.id}: Creator department unknown or not configured for escalation.`);
        continue;
      }

      const currentEscalations = finding.AuditFindingEscalations || [];
      const hasLevel1Escalation = currentEscalations.some(e => e.escalation_level === 1);
      const hasLevel2Escalation = currentEscalations.some(e => e.escalation_level === 2);

      // --- First Level Escalation (15 days) ---
      if (daysSinceCreation >= FIRST_ESCALATION_DAYS && !hasLevel1Escalation) {
        const firstSupervisorRole = ESCALATION_ROLES_MAP[creatorDepartment].level1;
        
        // Find the first supervisor in the hierarchy for the creator's department
        const supervisorChain = await UserService.getSupervisorChain(finding.createdBy.id, [firstSupervisorRole]);
        const firstSupervisor = supervisorChain.find(s => s.role === firstSupervisorRole && s.department === creatorDepartment);

        if (firstSupervisor) {
          await AuditFindingEscalation.create({
            finding_id: finding.id,
            escalated_to_id: firstSupervisor.id,
            escalated_by_id: null, // System escalation
            escalation_level: 1
          });
          console.log(`AuditFinding ${finding.id} escalated to 1st level supervisor: ${firstSupervisor.username} (${firstSupervisor.role})`);

          // Update AuditFinding status if it's not already Escalated
          if (finding.status !== 'Escalated') {
            const oldStatus = finding.status;
            finding.status = 'Escalated';
            await finding.save();
            // Log this status change
            await AuditAmendmentHistory.create({
              amend_by_id: null, // System amendment
              audit_finding_id: finding.id,
              // Snapshot other relevant finding details
              title: finding.title,
              description: finding.description,
              criteria: finding.criteria,
              cause: finding.cause,
              impact: finding.impact,
              recommendation: finding.recommendation,
              amount: finding.amount,
              risk_level_id: finding.risk_level_id,
              category_id: finding.category_id,
              risk_rating_id: finding.risk_rating_id,
              created_by_id: finding.created_by_id,
              status: finding.status, // New status
              rectification_id: finding.rectification_id,
            });
            console.log(`AuditFinding ${finding.id} status changed from ${oldStatus} to Escalated.`);
          }
        } else {
          console.warn(`Could not find 1st level supervisor for AuditFinding ${finding.id} (Creator: ${finding.createdBy.username}, Dept: ${creatorDepartment}).`);
        }
      }

      // --- Second Level Escalation (30 days) ---
      if (daysSinceCreation >= SECOND_ESCALATION_DAYS && !hasLevel2Escalation) {
        const secondSupervisorRole = ESCALATION_ROLES_MAP[creatorDepartment].level2;
        
        // Find the second supervisor in the hierarchy for the creator's department
        const supervisorChain = await UserService.getSupervisorChain(finding.createdBy.id, [secondSupervisorRole]);
        const secondSupervisor = supervisorChain.find(s => s.role === secondSupervisorRole && s.department === creatorDepartment);

        if (secondSupervisor) {
          await AuditFindingEscalation.create({
            finding_id: finding.id,
            escalated_to_id: secondSupervisor.id,
            escalated_by_id: null, // System escalation
            escalation_level: 2
          });
          console.log(`AuditFinding ${finding.id} escalated to 2nd level supervisor: ${secondSupervisor.username} (${secondSupervisor.role})`);

          // Update AuditFinding status if it's not already Escalated (though it likely is from level 1)
          if (finding.status !== 'Escalated') {
            const oldStatus = finding.status;
            finding.status = 'Escalated';
            await finding.save();
            // Log this status change
            await AuditAmendmentHistory.create({
              amend_by_id: null, // System amendment
              audit_finding_id: finding.id,
              // Snapshot other relevant finding details
              title: finding.title,
              description: finding.description,
              criteria: finding.criteria,
              cause: finding.cause,
              impact: finding.impact,
              recommendation: finding.recommendation,
              amount: finding.amount,
              risk_level_id: finding.risk_level_id,
              category_id: finding.category_id,
              risk_rating_id: finding.risk_rating_id,
              created_by_id: finding.created_by_id,
              status: finding.status, // New status
              rectification_id: finding.rectification_id,
            });
            console.log(`AuditFinding ${finding.id} status changed from ${oldStatus} to Escalated.`);
          }
        } else {
          console.warn(`Could not find 2nd level supervisor for AuditFinding ${finding.id} (Creator: ${finding.createdBy.username}, Dept: ${creatorDepartment}).`);
        }
      }
    }
    console.log('Audit finding escalation cron job finished.');
  } catch (error) {
    console.error('Error in audit finding escalation cron job:', error);
  }
};

// Schedule the cron job to run daily at a specific time (e.g., 2:00 AM)
// For testing, you might want to set it to run more frequently, like every minute: '* * * * *'
// Example: run daily at 2 AM
cron.schedule('0 2 * * *', escalateAuditFindings);

// Export the function so it can be called manually for testing or on server start if needed
module.exports = escalateAuditFindings;