const cron = require('node-cron');
const { AuditFinding, User, AuditFindingAssigned, AssignedNotification, EscalationNotification } = require('./models');
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
 * Check if a reminder has already been sent for a specific finding and interval
 */
const hasReminderBeenSent = async (findingId, daysRemaining, userId, notificationType = 'assigned') => {
  try {
    let reminderExists = false;
    
    if (notificationType === 'assigned') {
      const existingReminder = await AssignedNotification.findOne({
        where: {
          audit_finding_id: findingId,
          user_id: userId,
          message: {
            [Op.like]: `%${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining%`
          }
        }
      });
      reminderExists = !!existingReminder;
    } else if (notificationType === 'escalation') {
      const existingReminder = await EscalationNotification.findOne({
        where: {
          audit_finding_id: findingId,
          escalated_to_id: userId,
          message: {
            [Op.like]: `%${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining%`
          }
        }
      });
      reminderExists = !!existingReminder;
    }
    
    return reminderExists;
  } catch (error) {
    console.error(`Error checking reminder status for finding ${findingId}:`, error);
    return false; // If we can't check, assume not sent to avoid missing reminders
  }
};

/**
 * Create reminder notification for a user
 */
const createReminderNotification = async (finding, user, daysRemaining, notificationType = 'assigned') => {
  try {
    let message;
    if (daysRemaining === 0) {
      message = `Audit finding "${finding.title}" is due TODAY. Please complete your assigned tasks immediately.`;
    } else {
      message = `Audit finding "${finding.title}" is due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please ensure timely completion.`;
    }

    if (notificationType === 'assigned') {
      await AssignedNotification.create({
        audit_finding_id: finding.id,
        user_id: user.id,
        message: message
      });
    } else if (notificationType === 'escalation') {
      await EscalationNotification.create({
        audit_finding_id: finding.id,
        escalated_to_id: user.id,
        escalated_by_id: null, // System reminder
        message: message,
        escalation_level: 0 // Special level for reminders
      });
    }

    console.log(`Reminder notification created for ${user.username} (${notificationType}): ${daysRemaining} days remaining for finding ${finding.id}`);
    return true;
  } catch (error) {
    console.error(`Error creating reminder notification for user ${user.username}:`, error);
    return false;
  }
};

/**
 * Send reminder email to user
 */
const sendReminderEmail = async (user, finding, daysRemaining) => {
  try {
    let subject, urgencyLevel;
    
    if (daysRemaining === 0) {
      subject = `URGENT: Audit Finding Due TODAY - ${finding.title}`;
      urgencyLevel = 'URGENT';
    } else if (daysRemaining === 1) {
      subject = `REMINDER: Audit Finding Due Tomorrow - ${finding.title}`;
      urgencyLevel = 'HIGH';
    } else {
      subject = `REMINDER: Audit Finding Due in ${daysRemaining} Days - ${finding.title}`;
      urgencyLevel = 'MEDIUM';
    }

    await EmailService.sendAuditFindingReminder({
      to: user.email,
      subject: subject,
      finding: finding,
      daysRemaining: daysRemaining,
      urgencyLevel: urgencyLevel,
      recipientName: user.username
    });

    console.log(`Reminder email sent to ${user.email} for finding ${finding.id}: ${daysRemaining} days remaining`);
    return true;
  } catch (error) {
    console.error(`Error sending reminder email to ${user.email}:`, error);
    return false;
  }
};

/**
 * Main function to process audit finding reminders
 */
const processAuditFindingReminders = async () => {
  console.log('Running audit finding reminder cron job...');
  try {
    const now = new Date();

    // Find all pending audit findings with due dates
    const pendingFindings = await AuditFinding.findAll({
      where: {
        status: 'Pending', // Case-sensitive as specified
        due_date: {
          [Op.not]: null // Only findings with due dates
        }
      },
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
    });

    console.log(`Processing ${pendingFindings.length} pending findings with due dates...`);

    for (const finding of pendingFindings) {
      try {
        // Calculate days remaining until due date
        const daysRemaining = calculateDaysDifference(now, finding.due_date);

        console.log(`Processing finding ${finding.id}: ${daysRemaining} days remaining until due date`);

        // Check if this finding needs a reminder at any of our intervals
        if (!REMINDER_INTERVALS.includes(daysRemaining)) {
          continue; // Skip if not a reminder day
        }

        // Get assigned users
        const assignedUsers = finding.AuditFindingAssigneds?.map(a => a.assignedToUser).filter(Boolean) || [];

        if (assignedUsers.length === 0) {
          console.warn(`Skipping reminder for finding ${finding.id}: No assigned users found.`);
          continue;
        }

        // Process reminders for assigned users (all intervals)
        for (const assignedUser of assignedUsers) {
          // Check if reminder already sent
          const alreadySent = await hasReminderBeenSent(finding.id, daysRemaining, assignedUser.id, 'assigned');

          if (!alreadySent) {
            // Create notification
            const notificationCreated = await createReminderNotification(finding, assignedUser, daysRemaining, 'assigned');

            if (notificationCreated) {
              // Send email
              await sendReminderEmail(assignedUser, finding, daysRemaining);
            }
          } else {
            console.log(`Reminder already sent to ${assignedUser.username} for finding ${finding.id} (${daysRemaining} days remaining)`);
          }
        }

        // On due date (day 0), also notify the creator
        if (daysRemaining === 0 && finding.createdBy) {
          const alreadySentToCreator = await hasReminderBeenSent(finding.id, daysRemaining, finding.createdBy.id, 'escalation');

          if (!alreadySentToCreator) {
            // Create escalation-type notification for creator
            const notificationCreated = await createReminderNotification(finding, finding.createdBy, daysRemaining, 'escalation');

            if (notificationCreated) {
              // Send email to creator
              await sendReminderEmail(finding.createdBy, finding, daysRemaining);
            }
          } else {
            console.log(`Due date reminder already sent to creator ${finding.createdBy.username} for finding ${finding.id}`);
          }
        }

      } catch (error) {
        console.error(`Error processing reminder for finding ${finding.id}:`, error);
        // Continue processing other findings even if one fails
        continue;
      }
    }

    console.log('Audit finding reminder cron job finished.');
  } catch (error) {
    console.error('Error in audit finding reminder cron job:', error);
  }
};

/**
 * Test function to verify reminder logic for a specific finding
 */
const testReminderForFinding = async (findingId) => {
  console.log(`Testing reminder logic for finding ${findingId}...`);
  try {
    const finding = await AuditFinding.findByPk(findingId, {
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
    });

    if (!finding) {
      console.log(`Finding ${findingId} not found.`);
      return;
    }

    const now = new Date();
    const daysRemaining = finding.due_date ? calculateDaysDifference(now, finding.due_date) : null;
    const assignedUsers = finding.AuditFindingAssigneds?.map(a => a.assignedToUser).filter(Boolean) || [];

    console.log(`Finding details:`);
    console.log(`- ID: ${finding.id}`);
    console.log(`- Title: ${finding.title}`);
    console.log(`- Status: ${finding.status}`);
    console.log(`- Due date: ${finding.due_date}`);
    console.log(`- Days remaining: ${daysRemaining}`);
    console.log(`- Creator: ${finding.createdBy ? finding.createdBy.username : 'Unknown'}`);
    console.log(`- Assigned users: ${assignedUsers.map(u => u.username).join(', ')}`);

    // Test reminder eligibility
    console.log(`\nReminder eligibility:`);
    for (const interval of REMINDER_INTERVALS) {
      const eligible = daysRemaining === interval;
      const intervalDesc = interval === 0 ? 'Due date (today)' : `${interval} day${interval !== 1 ? 's' : ''} before due`;
      console.log(`- ${intervalDesc}: ${eligible ? 'ELIGIBLE' : 'Not eligible'}`);

      if (eligible && assignedUsers.length > 0) {
        console.log(`  → Would send reminders to: ${assignedUsers.map(u => u.username).join(', ')}`);
        if (interval === 0 && finding.createdBy) {
          console.log(`  → Would also send due date reminder to creator: ${finding.createdBy.username}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error testing reminder for finding ${findingId}:`, error);
  }
};

// Schedule the reminder cron job to run daily at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('Audit finding reminder cron job triggered at 9:00 AM');
  processAuditFindingReminders();
});

console.log('Audit finding reminder cron job scheduled to run daily at 9:00 AM');

// Export the functions so they can be called manually for testing or on server start if needed
module.exports = {
  processAuditFindingReminders,
  testReminderForFinding,
  calculateDaysDifference,
  hasReminderBeenSent,
  createReminderNotification,
  sendReminderEmail,
  REMINDER_INTERVALS
};
