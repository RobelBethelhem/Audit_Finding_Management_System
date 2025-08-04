const express = require('express');
const router = express.Router();
const EscalationRuleController = require('../controllers/EscalationRuleController');
const authenticateJWT = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// All routes require authentication and admin privileges
// GET all escalation rules
router.get('/', authenticateJWT, isAdmin, EscalationRuleController.getAll);

// GET a single escalation rule by ID
router.get('/:id', authenticateJWT, isAdmin, EscalationRuleController.getById);

// POST create a new escalation rule
router.post('/', authenticateJWT, isAdmin, EscalationRuleController.create);

// PUT update an escalation rule
router.put('/:id', authenticateJWT, isAdmin, EscalationRuleController.update);

// DELETE an escalation rule
router.delete('/:id', authenticateJWT, isAdmin, EscalationRuleController.delete);

// PUT toggle active status of an escalation rule
router.put('/:id/toggle-active', authenticateJWT, isAdmin, EscalationRuleController.toggleActive);

module.exports = router;