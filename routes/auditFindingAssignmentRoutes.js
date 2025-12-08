const express = require('express');
const router = express.Router();
const AuditFindingAssignmentController = require('../controllers/AuditFindingAssignmentController');
const {authenticate, authorize} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all assignments with pagination and filters
router.get('/', AuditFindingAssignmentController.getAllAssignments);

// Assign an audit finding to a user
router.post('/', AuditFindingAssignmentController.assignFinding);

// Remove an assignment (only creator can remove)
router.delete('/:assigned_id', AuditFindingAssignmentController.removeAssignment);

// Get all assignments for a finding
router.get('/finding/:finding_id', AuditFindingAssignmentController.getAssignmentsByFinding);

// Get all findings assigned to the logged-in user
router.get('/my-assignments', AuditFindingAssignmentController.getMyAssignedFindings);

module.exports = router;


