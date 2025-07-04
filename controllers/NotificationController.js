// controllers/NotificationController.js
const BaseController = require('./BaseController');
const { AssignedNotification, EscalationNotification, AuditFinding, User } = require('../models');

class NotificationController {
  constructor() {
    this.assignedNotificationInclude = [
      AuditFinding,
      { model: User, as: 'user' }
    ];
    
    this.escalationNotificationInclude = [
      AuditFinding,
      { model: User, as: 'escalatedTo' },
      { model: User, as: 'escalatedBy' }
    ];
  }

  // Assigned Notifications
  async createAssigned(req, res) {
    try {
      const notification = await AssignedNotification.create(req.body);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAssignedNotifications(req, res) {
    try {
      const notifications = await AssignedNotification.findAll({
        where: req.query,
        include: this.assignedNotificationInclude
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Escalation Notifications
  async createEscalation(req, res) {
    try {
      const notification = await EscalationNotification.create(req.body);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getEscalationNotifications(req, res) {
    try {
      const notifications = await EscalationNotification.findAll({
        where: req.query,
        include: this.escalationNotificationInclude
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new NotificationController();