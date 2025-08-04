const cron = require('node-cron');
const { ActionPlan, AuditFinding, User, AuditFindingAssigned, AssignedNotification, EscalationNotification } = require('./models');
const EmailService = require('./services/emailService');
const { Op } = require('sequelize');

// Define reminder intervals (days before due date)
const REMINDER_INTERVALS = [3, 2, 1, 0]; // 3 days, 2 days, 1 day, due date

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
 * Check if a reminder has already been sent for a specific action plan and interval
 */
const hasReminderBeenSent = async (actionPlanId, daysRemaining, userId, notificationType = 'assigned') => {
  try {
    let reminderExists = false;
    
    if (notificationType === 'assigned') {
      const existingReminder = await AssignedNotification.findOne({
        where: {
          audit_finding_id: actionPlanId, // Using action plan ID in the audit_finding_id field for action plan reminders
          user_id: userId,
          message: {
            [Op.like]: `%Action Plan%${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining%`
          }
        }
      });
      reminderExists = !!existingReminder;
    } else if (notificationType === 'escalation') {
      const existingReminder = await EscalationNotification.findOne({
        where: {
          audit_finding_id: actionPlanId, // Using action plan ID in the audit_finding_id field for action plan reminders
          escalated_to_id: userId,
          message: {
            [Op.like]: `%Action Plan%${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining%`
          }
        }
      });
      reminderExists = !!existingReminder;
    }
    
    return reminderExists;
  } catch (error) {
    console.error(`Error checking action plan reminder status for action plan ${actionPlanId}:`, error);
    return false; // If we can't check, assume not sent to avoid missing reminders
  }
};

/**
 * Create reminder notification for a user about an action plan
 */
const createActionPlanReminderNotification = async (actionPlan, user, daysRemaining, notificationType = 'assigned') => {
  try {
    let message;
    if (daysRemaining === 0) {
      message = `Action Plan "${actionPlan.title}" is due TODAY. Please complete your assigned tasks immediately.`;
    } else {
      message = `Action Plan "${actionPlan.title}" is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please ensure timely completion.`;
    }

    if (notificationType === 'assigned') {
      await AssignedNotification.create({
        audit_finding_id: actionPlan.id, // Using action plan ID for action plan reminders
        user_id: user.id,
        message: message
      });
    } else if (notificationType === 'escalation') {
      await EscalationNotification.create({
        audit_finding_id: actionPlan.id, // Using action plan ID for action plan reminders
        escalated_to_id: user.id,
        escalated_by_id: null, // System reminder
        message: message,
        escalation_level: 0 // Special level for reminders
      });
    }

    console.log(`Action Plan reminder notification created for ${user.username} (${notificationType}): ${daysRemaining} days remaining for action plan ${actionPlan.id}`);
    return true;
  } catch (error) {
    console.error(`Error creating action plan reminder notification for user ${user.username}:`, error);
    return false;
  }
};

/**
 * Send reminder email to user about an action plan
 */
const sendActionPlanReminderEmail = async (user, actionPlan, daysRemaining) => {
  try {
    let subject, urgencyLevel;
    
    if (daysRemaining === 0) {
      subject = `URGENT: Action Plan Due TODAY - ${actionPlan.title}`;
      urgencyLevel = 'URGENT';
    } else if (daysRemaining === 1) {
      subject = `REMINDER: Action Plan Due Tomorrow - ${actionPlan.title}`;
      urgencyLevel = 'HIGH';
    } else {
      subject = `REMINDER: Action Plan Due in ${daysRemaining} Days - ${actionPlan.title}`;
      urgencyLevel = 'MEDIUM';
    }

    await EmailService.sendActionPlanReminder({
      to: user.email,
      subject: subject,
      actionPlan: actionPlan,
      daysRemaining: daysRemaining,
      urgencyLevel: urgencyLevel,
      recipientName: user.username
    });

    console.log(`Action Plan reminder email sent to ${user.email} for action plan ${actionPlan.id}: ${daysRemaining} days remaining`);
    return true;
  } catch (error) {
    console.error(`Error sending action plan reminder email to ${user.email}:`, error);
    return false;
  }
};

/**
 * Main function to process action plan reminders
 */
const processActionPlanReminders = async () => {
  console.log('Running action plan reminder cron job...');
  try {
    const now = new Date();

    // Find all pending action plans with due dates
    const pendingActionPlans = await ActionPlan.findAll({
      where: {
        status: 'Pending', // Case-sensitive as specified
        due_date: {
          [Op.not]: null // Only action plans with due dates
        }
      },
      include: [
        {
          model: AuditFinding,
          // No alias needed - using default association name
          include: [
            {
              model: User,
              as: 'createdBy',
              attributes: ['id', 'username', 'email', 'department', 'role']
            },
            {
              model: AuditFindingAssigned,
              as: 'AuditFindingAssigneds',
              required: false,
              include: [{
                model: User,
                as: 'assignedToUser',
                attributes: ['id', 'username', 'email', 'department', 'role']
              }]
            }
          ]
        }
      ]
    });

    console.log(`Processing ${pendingActionPlans.length} pending action plans with due dates...`);

    for (const actionPlan of pendingActionPlans) {
      try {
        // Calculate days remaining until due date
        const daysRemaining = calculateDaysDifference(now, actionPlan.due_date);

        console.log(`Processing action plan ${actionPlan.id}: ${daysRemaining} days remaining until due date`);

        // Check if this action plan needs a reminder at any of our intervals
        if (!REMINDER_INTERVALS.includes(daysRemaining)) {
          continue; // Skip if not a reminder day
        }

        // Get the associated audit finding
        const auditFinding = actionPlan.AuditFinding;
        if (!auditFinding) {
          console.warn(`Skipping reminder for action plan ${actionPlan.id}: No associated audit finding found.`);
          continue;
        }

        // Get assigned users from the parent audit finding
        const assignedUsers = auditFinding.AuditFindingAssigneds?.map(a => a.assignedToUser).filter(Boolean) || [];

        if (assignedUsers.length === 0) {
          console.warn(`Skipping reminder for action plan ${actionPlan.id}: No assigned users found in parent audit finding.`);
          continue;
        }

        // Process reminders for assigned users (all intervals)
        for (const assignedUser of assignedUsers) {
          // Check if reminder already sent
          const alreadySent = await hasReminderBeenSent(actionPlan.id, daysRemaining, assignedUser.id, 'assigned');

          if (!alreadySent) {
            // Create notification
            const notificationCreated = await createActionPlanReminderNotification(actionPlan, assignedUser, daysRemaining, 'assigned');

            if (notificationCreated) {
              // Send email
              await sendActionPlanReminderEmail(assignedUser, actionPlan, daysRemaining);
            }
          } else {
            console.log(`Action Plan reminder already sent to ${assignedUser.username} for action plan ${actionPlan.id} (${daysRemaining} days remaining)`);
          }
        }

        // On due date (day 0), also notify the creator of the parent audit finding
        if (daysRemaining === 0 && auditFinding.createdBy) {
          const alreadySentToCreator = await hasReminderBeenSent(actionPlan.id, daysRemaining, auditFinding.createdBy.id, 'escalation');

          if (!alreadySentToCreator) {
            // Create escalation-type notification for creator
            const notificationCreated = await createActionPlanReminderNotification(actionPlan, auditFinding.createdBy, daysRemaining, 'escalation');

            if (notificationCreated) {
              // Send email to creator
              await sendActionPlanReminderEmail(auditFinding.createdBy, actionPlan, daysRemaining);
            }
          } else {
            console.log(`Action Plan due date reminder already sent to creator ${auditFinding.createdBy.username} for action plan ${actionPlan.id}`);
          }
        }

      } catch (error) {
        console.error(`Error processing action plan reminder for action plan ${actionPlan.id}:`, error);
        // Continue processing other action plans even if one fails
        continue;
      }
    }

    console.log('Action plan reminder cron job finished.');
  } catch (error) {
    console.error('Error in action plan reminder cron job:', error);
  }
};

/**
 * Test function to verify action plan reminder logic for a specific action plan
 */
const testActionPlanReminderForActionPlan = async (actionPlanId) => {
  console.log(`Testing action plan reminder logic for action plan ${actionPlanId}...`);
  try {
    const actionPlan = await ActionPlan.findByPk(actionPlanId, {
      include: [
        {
          model: AuditFinding,
          // No alias needed - using default association name
          include: [
            {
              model: User,
              as: 'createdBy',
              attributes: ['id', 'username', 'email', 'department', 'role']
            },
            {
              model: AuditFindingAssigned,
              as: 'AuditFindingAssigneds',
              required: false,
              include: [{
                model: User,
                as: 'assignedToUser',
                attributes: ['id', 'username', 'email', 'department', 'role']
              }]
            }
          ]
        }
      ]
    });

    if (!actionPlan) {
      console.log(`Action Plan ${actionPlanId} not found.`);
      return;
    }

    const now = new Date();
    const daysRemaining = actionPlan.due_date ? calculateDaysDifference(now, actionPlan.due_date) : null;
    const auditFinding = actionPlan.AuditFinding;
    const assignedUsers = auditFinding?.AuditFindingAssigneds?.map(a => a.assignedToUser).filter(Boolean) || [];

    console.log(`Action Plan details:`);
    console.log(`- ID: ${actionPlan.id}`);
    console.log(`- Title: ${actionPlan.title}`);
    console.log(`- Status: ${actionPlan.status}`);
    console.log(`- Due date: ${actionPlan.due_date}`);
    console.log(`- Days remaining: ${daysRemaining}`);
    console.log(`- Parent Audit Finding ID: ${auditFinding ? auditFinding.id : 'None'}`);
    console.log(`- Parent Audit Finding Creator: ${auditFinding?.createdBy ? auditFinding.createdBy.username : 'Unknown'}`);
    console.log(`- Assigned users (from parent finding): ${assignedUsers.map(u => u.username).join(', ')}`);

    // Test reminder eligibility
    console.log(`\nReminder eligibility:`);
    for (const interval of REMINDER_INTERVALS) {
      const eligible = daysRemaining === interval;
      const intervalDesc = interval === 0 ? 'Due date (today)' : `${interval} day${interval !== 1 ? 's' : ''} before due`;
      console.log(`- ${intervalDesc}: ${eligible ? 'ELIGIBLE' : 'Not eligible'}`);

      if (eligible && assignedUsers.length > 0) {
        console.log(`  → Would send reminders to assigned users: ${assignedUsers.map(u => u.username).join(', ')}`);
        if (interval === 0 && auditFinding?.createdBy) {
          console.log(`  → Would also send due date reminder to creator: ${auditFinding.createdBy.username}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error testing action plan reminder for action plan ${actionPlanId}:`, error);
  }
};

// Schedule the action plan reminder cron job to run daily at 9:30 AM (after audit finding reminders)
cron.schedule('0 30 9 * * *', () => {
  console.log('Action plan reminder cron job triggered at 9:30 AM');
  processActionPlanReminders();
});

console.log('Action plan reminder cron job scheduled to run daily at 9:30 AM');

// Export the functions so they can be called manually for testing or on server start if needed
module.exports = {
  processActionPlanReminders,
  testActionPlanReminderForActionPlan,
  calculateDaysDifference,
  hasReminderBeenSent,
  createActionPlanReminderNotification,
  sendActionPlanReminderEmail,
  REMINDER_INTERVALS
};
