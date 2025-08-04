const express = require('express');
const router = express.Router();
const InspectorBranchAssignmentController = require('../controllers/InspectorBranchAssignmentController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @route GET /api/inspector-branch-assignments
 * @desc Get all inspector branch assignments with pagination and filters
 * @access Private (Inspection supervisors/directors only)
 */
router.get('/', authenticateJWT, InspectorBranchAssignmentController.getAllAssignments);

/**
 * @route POST /api/inspector-branch-assignments
 * @desc Create new inspector branch assignment
 * @access Private (Inspection supervisors/directors only)
 */
router.post('/', authenticateJWT, InspectorBranchAssignmentController.createAssignment);

/**
 * @route PUT /api/inspector-branch-assignments/:assignmentId
 * @desc Update inspector branch assignment
 * @access Private (Inspection supervisors/directors only)
 */
router.put('/:assignmentId', authenticateJWT, InspectorBranchAssignmentController.updateAssignment);

/**
 * @route DELETE /api/inspector-branch-assignments/:assignmentId
 * @desc Deactivate inspector branch assignment
 * @access Private (Inspection supervisors/directors only)
 */
router.delete('/:assignmentId', authenticateJWT, InspectorBranchAssignmentController.deactivateAssignment);

/**
 * @route GET /api/inspector-branch-assignments/available-inspectors
 * @desc Get available inspectors for assignment
 * @access Private (Inspection supervisors/directors only)
 */
router.get('/available-inspectors', authenticateJWT, InspectorBranchAssignmentController.getAvailableInspectors);

/**
 * @route GET /api/inspector-branch-assignments/inspector/:inspectorId
 * @desc Get assignments for a specific inspector
 * @access Private (Inspector themselves or supervisors/directors)
 */
router.get('/inspector/:inspectorId', authenticateJWT, InspectorBranchAssignmentController.getInspectorAssignments);

module.exports = router;
