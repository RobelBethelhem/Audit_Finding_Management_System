const express = require('express');
const router = express.Router();
const BranchAssignmentController = require('../controllers/BranchAssignmentController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @route POST /api/branch-assignments/assign-to-branch
 * @desc Assign audit finding to a branch (for auditors)
 * @access Private (Auditor roles only)
 */
router.post('/assign-to-branch', authenticateJWT, BranchAssignmentController.assignToBranch);

/**
 * @route POST /api/branch-assignments/assign-to-user
 * @desc Assign audit finding from branch to specific user (for branch supervisors)
 * @access Private (Branch supervisors only)
 */
router.post('/assign-to-user', authenticateJWT, BranchAssignmentController.assignToUser);

/**
 * @route GET /api/branch-assignments/available-branches
 * @desc Get available branches for assignment
 * @access Private (Auditor roles only)
 */
router.get('/available-branches', authenticateJWT, BranchAssignmentController.getAvailableBranches);

/**
 * @route GET /api/branch-assignments/assignable-users/:branch_id
 * @desc Get assignable users in a specific branch (for branch supervisors)
 * @access Private (Branch supervisors only)
 */
router.get('/assignable-users/:branch_id', authenticateJWT, BranchAssignmentController.getAssignableUsersInBranch);

module.exports = router;
