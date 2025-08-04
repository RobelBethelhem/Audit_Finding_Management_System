const cron = require('node-cron');
const { AuditFinding, User, AuditFindingAssigned, AuditFindingEscalation, AuditAmendmentHistory, EscalationRule, EscalationNotification } = require('./models');
const UserService = require('./services/userService');
const EmailService = require('./services/emailService');
const { Op } = require('sequelize');

// Define default escalation thresholds in days (as fallback)
const DEFAULT_FIRST_ESCALATION_DAYS = 15;
const DEFAULT_SECOND_ESCALATION_DAYS = 30;
const DEFAULT_ADDITIONAL_LEVEL_INCREMENT = 5; // Days to add for each level after 2
const MAX_ESCALATION_LEVELS = 10;

// Default roles involved in escalation (as fallback)
const DEFAULT_ESCALATION_ROLES_MAP = {
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

/**
 * Calculate the number of calendar days between two dates
 * This properly handles date boundaries (e.g., July 11 to July 12 = 1 day)
 */
const calculateDaysDifference = (startDate, endDate) => {
  // Convert to Date objects if they aren't already
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set both dates to midnight (00:00:00) to compare calendar days only
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  // Calculate the difference in milliseconds and convert to days
  const timeDifference = endMidnight.getTime() - startMidnight.getTime();
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  return daysDifference;
};

/**
 * Calculate escalation days for a given level
 */
const getEscalationDaysForLevel = (level) => {
  if (level === 1) return DEFAULT_FIRST_ESCALATION_DAYS;
  if (level === 2) return DEFAULT_SECOND_ESCALATION_DAYS;
  // For levels 3+, add 5 days for each additional level
  return DEFAULT_SECOND_ESCALATION_DAYS + ((level - 2) * DEFAULT_ADDITIONAL_LEVEL_INCREMENT);
};

/**
 * Get the supervisor chain for a user up to a specified level
 */
const getSupervisorAtLevel = async (userId, targetLevel) => {
  let currentUser = await User.findByPk(userId);
  let level = 0;

  while (currentUser && currentUser.supervisor && level < targetLevel) {
    currentUser = await User.findByPk(currentUser.supervisor);
    level++;
  }

  return level === targetLevel ? currentUser : null;
};

/**
 * Builds a query condition for finding matching escalation rules
 */
const buildRuleCondition = (finding) => {
  const conditions = {
    department: finding.createdBy.department,
    is_active: true
  };
  
  // Add optional conditions if they exist in the finding
  if (finding.risk_level_id) {
    conditions.risk_level_id = {
      [Op.or]: [finding.risk_level_id, null]
    };
  }
  
  if (finding.category_id) {
    conditions.category_id = {
      [Op.or]: [finding.category_id, null]
    };
  }
  
  if (finding.risk_rating_id) {
    conditions.risk_rating_id = {
      [Op.or]: [finding.risk_rating_id, null]
    };
  }
  
  // Add IT_Audit specific conditions
  if (finding.createdBy.department === 'IT_Audit') {
    if (finding.vulnerability_id) {
      conditions.vulnerability_id = {
        [Op.or]: [finding.vulnerability_id, null]
      };
    }
    
    if (finding.compliance_gap_id) {
      conditions.compliance_gap_id = {
        [Op.or]: [finding.compliance_gap_id, null]
      };
    }
    
    if (finding.standard_id) {
      conditions.standard_id = {
        [Op.or]: [finding.standard_id, null]
      };
    }
  }
  
  return conditions;
};

/**
 * Sends reminder emails for findings approaching escalation
 */
const sendEscalationReminders = async () => {
  console.log('Checking for escalation reminders...');
  try {
    const now = new Date();
    
    // Find all active escalation rules
    const escalationRules = await EscalationRule.findAll({
      where: { is_active: true }
    });
    
    // Group rules by escalation level for easier processing
    const rulesByLevel = {};
    escalationRules.forEach(rule => {
      if (!rulesByLevel[rule.escalation_level]) {
        rulesByLevel[rule.escalation_level] = [];
      }
      rulesByLevel[rule.escalation_level].push(rule);
    });
    
    // Find audit findings that are not yet resolved
    const unresolved = await AuditFinding.findAll({
      where: {
        status: {
          [Op.notIn]: ['Resolved']
        }
      },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'email', 'department', 'role']
        },
        {
          model: AuditFindingEscalation,
          as: 'AuditFindingEscalations',
          required: false
        },
        {
          model: AuditFindingAssigned,
          as: 'AuditFindingAssigneds',
          required: false,
          include: [{
            model: User,
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'department', 'role', 'supervisor']
          }]
        }
      ]
    });
    
    for (const finding of unresolved) {
      const daysSinceCreation = calculateDaysDifference(finding.createdAt, now);
      
      // Skip if no creator department
      if (!finding.createdBy || !finding.createdBy.department) continue;
      
      // Get applicable rules for this finding
      const ruleCondition = buildRuleCondition(finding);
      const applicableRules = await EscalationRule.findAll({
        where: ruleCondition
      });
      
      // Check each rule for reminder eligibility
      for (const rule of applicableRules) {
        // Calculate when this finding would be escalated
        const escalationDate = new Date(createdAt);
        escalationDate.setDate(escalationDate.getDate() + rule.days_threshold);
        
        // Calculate days until escalation
        const daysUntilEscalation = Math.floor((escalationDate - now) / (1000 * 60 * 60 * 24));
        
        // If we're within the reminder window, send a notification
        if (daysUntilEscalation > 0 && daysUntilEscalation <= rule.send_reminder_days_before) {
          // Find the current assignee
          const currentAssignees = finding.AuditFindingAssigneds || [];
          if (currentAssignees && currentAssignees.length > 0) {
            for (const assignment of currentAssignees) {
              const assignee = assignment.assignedToUser || await User.findByPk(assignment.assigned_to_id);
              if (assignee) {
                // Send email reminder
                await EmailService.sendEscalationReminder({
                  to: assignee.email,
                  finding: finding,
                  daysRemaining: daysUntilEscalation,
                  escalationLevel: rule.escalation_level
                });
                
                console.log(`Sent escalation reminder to ${assignee.email} for finding ${finding.id}. ${daysUntilEscalation} days until level ${rule.escalation_level} escalation.`);
              }
            }
          }
        }
      }
    }
    
    console.log('Escalation reminders check completed.');
  } catch (error) {
    console.error('Error in escalation reminders:', error);
  }
};

/**
 * Create escalation record and notification
 */
const createEscalation = async (finding, escalatedToUser, escalationLevel, assignedUser = null) => {
  try {
    // Create escalation record
    await AuditFindingEscalation.create({
      finding_id: finding.id,
      escalated_to_id: escalatedToUser.id,
      escalated_by_id: null, // System escalation
      escalation_level: escalationLevel
    });

    // Create notification
    const assignedUserInfo = assignedUser ? ` as the ${escalationLevel === 1 ? 'supervisor' : `level ${escalationLevel} supervisor`} of ${assignedUser.username}` : '';
    await EscalationNotification.create({
      audit_finding_id: finding.id,
      escalated_to_id: escalatedToUser.id,
      escalated_by_id: null,
      message: `Audit finding "${finding.title}" has been escalated to you (Level ${escalationLevel})${assignedUserInfo}.`,
      escalation_level: escalationLevel
    });

    // Send email notification
    await EmailService.sendEscalationNotification({
      to: escalatedToUser.email,
      finding: finding,
      escalationLevel: escalationLevel
    });

    console.log(`AuditFinding ${finding.id} escalated to level ${escalationLevel} supervisor: ${escalatedToUser.username}${assignedUserInfo}`);

    // Update AuditFinding status if it's not already Escalated
    if (finding.status !== 'Escalated') {
      const oldStatus = finding.status;
      finding.status = 'Escalated';
      await finding.save();

      // Log this status change
      await AuditAmendmentHistory.create({
        amend_by_id: null, // System amendment
        audit_finding_id: finding.id,
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
        status: finding.status,
        rectification_id: finding.rectification_id,
        vulnerability_id: finding.vulnerability_id,
        compliance_gap_id: finding.compliance_gap_id,
        standard_id: finding.standard_id
      });

      console.log(`AuditFinding ${finding.id} status changed from ${oldStatus} to Escalated.`);
    }

    return true;
  } catch (error) {
    console.error(`Error creating escalation for finding ${finding.id} at level ${escalationLevel}:`, error);
    return false;
  }
};

/**
 * Main function to escalate audit findings with dynamic multi-level escalation
 */
const escalateAuditFindings = async () => {
  console.log('Running audit finding escalation cron job...');
  try {
    const now = new Date();

    // Find audit findings that are not yet resolved
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
          attributes: ['id', 'username', 'email', 'department', 'role']
        },
        {
          model: AuditFindingEscalation,
          as: 'AuditFindingEscalations',
          required: false
        },
        {
          model: AuditFindingAssigned,
          as: 'AuditFindingAssigneds',
          required: false,
          include: [{
            model: User,
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'department', 'role', 'supervisor']
          }]
        }
      ]
    });

    console.log(`Processing ${findingsToEscalate.length} findings for escalation...`);

    for (const finding of findingsToEscalate) {
      try {
        const daysSinceCreation = calculateDaysDifference(finding.createdAt, now);

        if (!finding.createdBy || !finding.createdBy.department) {
          console.warn(`Skipping escalation for AuditFinding ${finding.id}: Creator department unknown.`);
          continue;
        }

        // Get current escalations for this finding
        const currentEscalations = finding.AuditFindingEscalations || [];
        const escalationLevels = currentEscalations.map(e => e.escalation_level);

        // Get assigned users - ensure we're using the correct association and property names
        const assignedUsers = finding.AuditFindingAssigneds?.map(a => a.assignedToUser).filter(Boolean) || [];

        if (assignedUsers.length === 0) {
          console.warn(`Skipping escalation for AuditFinding ${finding.id}: No assigned users found.`);
          continue;
        }

        console.log(`Processing finding ${finding.id}: ${daysSinceCreation} days old, current escalation levels: [${escalationLevels.join(', ')}]`);

        // Check for escalations up to MAX_ESCALATION_LEVELS
        for (let level = 1; level <= MAX_ESCALATION_LEVELS; level++) {
          const requiredDays = getEscalationDaysForLevel(level);

          // Check if this level should be escalated and hasn't been already
          if (daysSinceCreation >= requiredDays && !escalationLevels.includes(level)) {
            console.log(`Finding ${finding.id} is eligible for level ${level} escalation (${daysSinceCreation} >= ${requiredDays} days)`);

            // Process escalation for each assigned user
            for (const assignedUser of assignedUsers) {
              const supervisor = await getSupervisorAtLevel(assignedUser.id, level);

              if (supervisor) {
                const success = await createEscalation(finding, supervisor, level, assignedUser);
                if (success) {
                  // Add this level to the escalation levels to prevent duplicate processing
                  escalationLevels.push(level);
                }
              } else {
                console.warn(`No level ${level} supervisor found for user ${assignedUser.username} (finding ${finding.id}). Stopping escalation chain.`);
                // If no supervisor exists at this level, stop escalating for this user
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing escalation for finding ${finding.id}:`, error);
        // Continue processing other findings even if one fails
        continue;
      }
    }

    console.log('Audit finding escalation cron job finished.');
  } catch (error) {
    console.error('Error in audit finding escalation cron job:', error);
  }
};

// Schedule the cron jobs
// Run escalation job daily at 2:00 AM
cron.schedule('0 2 * * *', escalateAuditFindings);

// Run reminder job daily at 1:00 AM
cron.schedule('0 1 * * *', sendEscalationReminders);

/**
 * Test function to verify escalation logic for a specific finding
 */
const testEscalationForFinding = async (findingId) => {
  console.log(`Testing escalation logic for finding ${findingId}...`);
  try {
    const finding = await AuditFinding.findByPk(findingId, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'email', 'department', 'role']
        },
        {
          model: AuditFindingEscalation,
          as: 'AuditFindingEscalations',
          required: false
        },
        {
          model: AuditFindingAssigned,
          as: 'AuditFindingAssigneds',
          required: false,
          include: [{
            model: User,
            as: 'assignedToUser',
            attributes: ['id', 'username', 'email', 'department', 'role', 'supervisor']
          }]
        }
      ]
    });

    if (!finding) {
      console.log(`Finding ${findingId} not found.`);
      return;
    }

    const now = new Date();
    const daysSinceCreation = calculateDaysDifference(finding.createdAt, now);
    const currentEscalations = finding.AuditFindingEscalations || [];
    const escalationLevels = currentEscalations.map(e => e.escalation_level);
    const assignedUsers = finding.AuditFindingAssigneds?.map(a => a.assignedToUser).filter(Boolean) || [];

    console.log(`Finding details:`);
    console.log(`- ID: ${finding.id}`);
    console.log(`- Title: ${finding.title}`);
    console.log(`- Status: ${finding.status}`);
    console.log(`- Raw createdAt: ${finding.createdAt}`);
    console.log(`- Raw createdAt type: ${typeof finding.createdAt}`);
    console.log(`- Current time: ${now}`);

    // Show both calculation methods for comparison
    const createdAt = new Date(finding.createdAt);
    const oldCalculation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    console.log(`- Old calculation (24-hour periods): ${oldCalculation} days`);
    console.log(`- New calculation (calendar days): ${daysSinceCreation} days`);
    console.log(`- Current escalation levels: [${escalationLevels.join(', ')}]`);
    console.log(`- Assigned users: ${assignedUsers.map(u => u.username).join(', ')}`);

    // Test escalation levels
    for (let level = 1; level <= MAX_ESCALATION_LEVELS; level++) {
      const requiredDays = getEscalationDaysForLevel(level);
      const eligible = daysSinceCreation >= requiredDays && !escalationLevels.includes(level);
      console.log(`- Level ${level}: ${requiredDays} days required, eligible: ${eligible}`);

      if (eligible && assignedUsers.length > 0) {
        for (const assignedUser of assignedUsers) {
          const supervisor = await getSupervisorAtLevel(assignedUser.id, level);
          console.log(`  - ${assignedUser.username} -> Level ${level} supervisor: ${supervisor ? supervisor.username : 'None'}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error testing escalation for finding ${findingId}:`, error);
  }
};

// Export the functions so they can be called manually for testing or on server start if needed
module.exports = {
  escalateAuditFindings,
  sendEscalationReminders,
  testEscalationForFinding,
  getEscalationDaysForLevel,
  getSupervisorAtLevel,
  calculateDaysDifference
};
