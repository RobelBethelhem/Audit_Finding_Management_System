const express = require('express');
const router = express.Router();
const ActionPlanController = require('../controllers/ActionPlanController'); // Assuming ActionPlanController is exported from controllers/index.js
const authenticateJWT = require('../middleware/auth'); // Assuming your authentication middleware is here

// Routes for Action Plans
// GET all action plans
router.get('/', authenticateJWT, ActionPlanController.findAll);
// GET a single action plan by ID
router.get('/:id', authenticateJWT, ActionPlanController.findById);

// POST create a new action plan (requires authentication and specific authorization within the controller)
router.post('/', authenticateJWT, ActionPlanController.create); // Renamed createActionPlan to create

// PUT update an action plan (requires authentication and authorization)
router.put('/:id', authenticateJWT, ActionPlanController.authorizeActionPlanAccess, ActionPlanController.updateActionPlan);

// PUT update action plan status (requires authentication and specific status change authorization)
router.put('/:id/status', authenticateJWT, ActionPlanController.authorizeActionPlanStatusChange, ActionPlanController.updateActionPlanStatus);

// DELETE an action plan (requires authentication and authorization - if soft delete, it will just mark as deleted)
// router.delete('/:id', authenticateJWT, ActionPlanController.authorizeActionPlanAccess, ActionPlanController.delete);
// Note: BaseController has a generic delete. If you need specific action plan deletion logic, implement it in controller.

module.exports = router;
