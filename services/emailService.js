const nodemailer = require('nodemailer');
const config = require('../config/email');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password
      }
    });
  }

  /**
   * Send an escalation notification email
   */
  async sendEscalationNotification({ to, finding, escalationLevel }) {
    const subject = `Audit Finding Escalation - Level ${escalationLevel}`;
    
    const html = `
      <h2>Audit Finding Escalation</h2>
      <p>An audit finding has been escalated to you (Level ${escalationLevel}):</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
          <th>Finding ID</th>
          <td>${finding.id}</td>
        </tr>
        <tr>
          <th>Title</th>
          <td>${finding.title}</td>
        </tr>
        <tr>
          <th>Description</th>
          <td>${finding.description}</td>
        </tr>
        <tr>
          <th>Created By</th>
          <td>${finding.createdBy ? finding.createdBy.username : 'Unknown'}</td>
        </tr>
        <tr>
          <th>Department</th>
          <td>${finding.createdBy ? finding.createdBy.department : 'Unknown'}</td>
        </tr>
        <tr>
          <th>Created Date</th>
          <td>${new Date(finding.created_at).toLocaleDateString()}</td>
        </tr>
      </table>
      <p>Please log in to the system to review this finding and take appropriate action.</p>
    `;
    
    return this.sendEmail({
      to,
      subject,
      html
    });
  }

  /**
   * Send a reminder email for upcoming escalation
   */
  async sendEscalationReminder({ to, finding, daysRemaining, escalationLevel }) {
    const subject = `Upcoming Audit Finding Escalation - ${daysRemaining} days remaining`;
    
    const html = `
      <h2>Upcoming Audit Finding Escalation</h2>
      <p>An audit finding will be escalated in <strong>${daysRemaining} days</strong> to Level ${escalationLevel} if not resolved:</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
          <th>Finding ID</th>
          <td>${finding.id}</td>
        </tr>
        <tr>
          <th>Title</th>
          <td>${finding.title}</td>
        </tr>
        <tr>
          <th>Description</th>
          <td>${finding.description}</td>
        </tr>
        <tr>
          <th>Created Date</th>
          <td>${new Date(finding.created_at).toLocaleDateString()}</td>
        </tr>
      </table>
      <p>Please log in to the system to address this finding before it is escalated.</p>
    `;
    
    return this.sendEmail({
      to,
      subject,
      html
    });
  }

  /**
   * Send an audit finding reminder email
   */
  async sendAuditFindingReminder({ to, subject, finding, daysRemaining, urgencyLevel, recipientName }) {
    let urgencyColor = '#007bff'; // Default blue
    let urgencyText = 'REMINDER';

    if (urgencyLevel === 'URGENT') {
      urgencyColor = '#dc3545'; // Red
      urgencyText = 'URGENT';
    } else if (urgencyLevel === 'HIGH') {
      urgencyColor = '#fd7e14'; // Orange
      urgencyText = 'HIGH PRIORITY';
    }

    const dueDateFormatted = finding.due_date ? new Date(finding.due_date).toLocaleDateString() : 'Not specified';
    const createdDateFormatted = finding.createdAt ? new Date(finding.createdAt).toLocaleDateString() : 'Unknown';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${urgencyColor}; color: white; padding: 15px; text-align: center;">
          <h2 style="margin: 0;">${urgencyText}: Audit Finding Reminder</h2>
        </div>

        <div style="padding: 20px; background-color: #f8f9fa;">
          <p>Dear ${recipientName},</p>

          ${daysRemaining === 0
            ? '<p><strong>This audit finding is DUE TODAY.</strong> Please complete your assigned tasks immediately.</p>'
            : `<p>This is a reminder that an audit finding assigned to you is due in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>.</p>`
          }

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background-color: #e9ecef;">
              <th style="text-align: left;">Finding Details</th>
              <th style="text-align: left;">Information</th>
            </tr>
            <tr>
              <td><strong>Finding ID</strong></td>
              <td>${finding.id}</td>
            </tr>
            <tr>
              <td><strong>Title</strong></td>
              <td>${finding.title}</td>
            </tr>
            <tr>
              <td><strong>Description</strong></td>
              <td>${finding.description}</td>
            </tr>
            <tr>
              <td><strong>Status</strong></td>
              <td>${finding.status}</td>
            </tr>
            <tr>
              <td><strong>Due Date</strong></td>
              <td style="color: ${urgencyColor}; font-weight: bold;">${dueDateFormatted}</td>
            </tr>
            <tr>
              <td><strong>Created Date</strong></td>
              <td>${createdDateFormatted}</td>
            </tr>
            <tr>
              <td><strong>Created By</strong></td>
              <td>${finding.createdBy ? finding.createdBy.username : 'Unknown'}</td>
            </tr>
          </table>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0;"><strong>Action Required:</strong></p>
            <p style="margin: 5px 0 0 0;">Please log in to the audit system to review and complete your assigned tasks for this finding.</p>
          </div>

          <p>Thank you for your attention to this matter.</p>
          <p>Best regards,<br>Audit Management System</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html
    });
  }

  /**
   * Send an action plan reminder email
   */
  async sendActionPlanReminder({ to, subject, actionPlan, daysRemaining, urgencyLevel, recipientName }) {
    let urgencyColor = '#007bff'; // Default blue
    let urgencyText = 'REMINDER';

    if (urgencyLevel === 'URGENT') {
      urgencyColor = '#dc3545'; // Red
      urgencyText = 'URGENT';
    } else if (urgencyLevel === 'HIGH') {
      urgencyColor = '#fd7e14'; // Orange
      urgencyText = 'HIGH PRIORITY';
    }

    const dueDateFormatted = actionPlan.due_date ? new Date(actionPlan.due_date).toLocaleDateString() : 'Not specified';
    const createdDateFormatted = actionPlan.createdAt ? new Date(actionPlan.createdAt).toLocaleDateString() : 'Unknown';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${urgencyColor}; color: white; padding: 15px; text-align: center;">
          <h2 style="margin: 0;">${urgencyText}: Action Plan Reminder</h2>
        </div>

        <div style="padding: 20px; background-color: #f8f9fa;">
          <p>Dear ${recipientName},</p>

          ${daysRemaining === 0
            ? '<p><strong>This action plan is DUE TODAY.</strong> Please complete your assigned tasks immediately.</p>'
            : `<p>This is a reminder that an action plan assigned to you is due in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>.</p>`
          }

          <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background-color: #e9ecef;">
              <th style="text-align: left;">Action Plan Details</th>
              <th style="text-align: left;">Information</th>
            </tr>
            <tr>
              <td><strong>Action Plan ID</strong></td>
              <td>${actionPlan.id}</td>
            </tr>
            <tr>
              <td><strong>Title</strong></td>
              <td>${actionPlan.title}</td>
            </tr>
            <tr>
              <td><strong>Description</strong></td>
              <td>${actionPlan.description || 'No description provided'}</td>
            </tr>
            <tr>
              <td><strong>Status</strong></td>
              <td>${actionPlan.status}</td>
            </tr>
            <tr>
              <td><strong>Due Date</strong></td>
              <td style="color: ${urgencyColor}; font-weight: bold;">${dueDateFormatted}</td>
            </tr>
            <tr>
              <td><strong>Created Date</strong></td>
              <td>${createdDateFormatted}</td>
            </tr>
            <tr>
              <td><strong>Timeline Start</strong></td>
              <td>${actionPlan.timeline_start ? new Date(actionPlan.timeline_start).toLocaleDateString() : 'Not specified'}</td>
            </tr>
            <tr>
              <td><strong>Timeline End</strong></td>
              <td>${actionPlan.timeline_end ? new Date(actionPlan.timeline_end).toLocaleDateString() : 'Not specified'}</td>
            </tr>
          </table>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0;"><strong>Action Required:</strong></p>
            <p style="margin: 5px 0 0 0;">Please log in to the audit system to review and complete your assigned action plan tasks.</p>
          </div>

          <p>Thank you for your attention to this matter.</p>
          <p>Best regards,<br>Audit Management System</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html
    });
  }

  /**
   * Base method to send emails
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: config.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML if text not provided
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();