// controllers/NotificationController.js
const BaseController = require('./BaseController');
const { AssignedNotification, EscalationNotification, AuditFinding, User } = require('../models');
const { Op } = require('sequelize');

class NotificationController {
  constructor() {
    this.assignedNotificationInclude = [
      {
        model: AuditFinding,
        attributes: ['id', 'title', 'description']
      }
    ];

    this.escalationNotificationInclude = [
      {
        model: AuditFinding,
        attributes: ['id', 'title', 'description']
      }
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

  // Get all notifications for the current user
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unread_only = true } = req.query; // Default to unread only
      const offset = (page - 1) * limit;

      // Build where clause for read status - default to unread only
      const readFilter = unread_only === 'true' || unread_only === true ? { read: false } : {};

      console.log('Fetching notifications for user:', userId);
      console.log('Read filter:', readFilter);

      // Get assigned notifications using user_id
      let assignedNotifications = [];
      try {
        assignedNotifications = await AssignedNotification.findAll({
          where: {
            user_id: userId,
            ...readFilter
          },
          order: [['created_at', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
        console.log('Found assigned notifications:', assignedNotifications.length);
      } catch (error) {
        console.error('Error fetching assigned notifications:', error.message);
      }

      // Get escalation notifications using escalated_to_id
      let escalationNotifications = [];
      try {
        escalationNotifications = await EscalationNotification.findAll({
          attributes: ['notification_id', 'audit_finding_id', 'escalated_to_id', 'escalated_by_id', 'message', 'read', 'escalation_level', 'created_at', 'updated_at'],
          where: {
            escalated_to_id: userId,
            ...readFilter
          },
          order: [['created_at', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
        console.log('Found escalation notifications:', escalationNotifications.length);
      } catch (error) {
        console.error('Error fetching escalation notifications:', error.message);
      }

      // Combine and sort notifications by created_at
      const allNotifications = [
        ...assignedNotifications.map(notification => ({
          ...notification.toJSON(),
          type: 'assigned',
          notification_id: notification.notification_id
        })),
        ...escalationNotifications.map(notification => ({
          ...notification.toJSON(),
          type: 'escalation',
          notification_id: notification.notification_id
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply pagination to combined results
      const paginatedNotifications = allNotifications.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: paginatedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allNotifications.length
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notifications',
        error: error.message
      });
    }
  }

  // Get notification count for the current user
  async getNotificationCount(req, res) {
    try {
      const userId = req.user.id;

      // Count unread assigned notifications
      const assignedCount = await AssignedNotification.count({
        where: {
          user_id: userId,
          read: false
        }
      });

      // Count unread escalation notifications
      const escalationCount = await EscalationNotification.count({
        where: {
          escalated_to_id: userId,
          read: false
        }
      });

      const totalCount = assignedCount + escalationCount;

      res.json({
        success: true,
        data: {
          total: totalCount,
          assigned: assignedCount,
          escalation: escalationCount
        }
      });
    } catch (error) {
      console.error('Error fetching notification count:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notification count',
        error: error.message
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { type } = req.body; // 'assigned' or 'escalation'
      const userId = req.user.id;

      let notification;

      if (type === 'assigned') {
        notification = await AssignedNotification.findOne({
          where: {
            notification_id: notificationId,
            user_id: userId
          }
        });
      } else if (type === 'escalation') {
        notification = await EscalationNotification.findOne({
          where: {
            notification_id: notificationId,
            escalated_to_id: userId
          }
        });
      }

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.update({ read: true });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking notification as read',
        error: error.message
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      // Mark all assigned notifications as read
      await AssignedNotification.update(
        { read: true },
        {
          where: {
            user_id: userId,
            read: false
          }
        }
      );

      // Mark all escalation notifications as read
      await EscalationNotification.update(
        { read: true },
        {
          where: {
            escalated_to_id: userId,
            read: false
          }
        }
      );

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking all notifications as read',
        error: error.message
      });
    }
  }
}

module.exports = new NotificationController();