const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/NotificationController');
const authenticateJWT = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Get all notifications for current user
router.get('/', notificationController.getNotifications.bind(notificationController));

// Get notification count for current user
router.get('/count', notificationController.getNotificationCount.bind(notificationController));

// Mark specific notification as read
router.put('/:notificationId/read', notificationController.markAsRead.bind(notificationController));

// Mark all notifications as read
router.put('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

// Legacy routes for backward compatibility
router.get('/assigned', notificationController.getAssignedNotifications.bind(notificationController));
router.post('/assigned', notificationController.createAssigned.bind(notificationController));
router.get('/escalation', notificationController.getEscalationNotifications.bind(notificationController));
router.post('/escalation', notificationController.createEscalation.bind(notificationController));

module.exports = router;
