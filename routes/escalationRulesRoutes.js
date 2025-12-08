const express = require('express');
const router = express.Router();
const EscalationRuleController = require('../controllers/EscalationRuleController');
const {authenticate, authorize} = require('../middleware/auth');

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
router.get('/', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), EscalationRuleController.getAll);

// GET a single escalation rule by ID
router.get('/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), EscalationRuleController.getById);

// POST create a new escalation rule
router.post('/', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), EscalationRuleController.create);

// PUT update an escalation rule
router.put('/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), EscalationRuleController.update);

// DELETE an escalation rule
router.delete('/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), EscalationRuleController.delete);

// PUT toggle active status of an escalation rule
router.put('/:id/toggle-active', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), EscalationRuleController.toggleActive);

module.exports = router;