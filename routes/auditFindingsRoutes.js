const express = require('express');
const router = express.Router();
const AuditFindingController = require('../controllers/AuditFindingController');
const authenticateJWT = require('../middleware/auth'); // Assuming your authentication middleware is here

// Public routes (if any, e.g., view all findings without auth)
// router.get('/', AuditFindingController.findAll); // Uncomment if public access is desired
// router.get('/:id', AuditFindingController.findById); // Uncomment if public access is desired

// Routes requiring authentication and authorization
// GET all audit findings (requires authentication, then can filter by user's access)
router.get('/', authenticateJWT, AuditFindingController.findAll);
// GET a single audit finding by ID (requires authentication)
router.get('/:id', authenticateJWT, AuditFindingController.findById);

// POST create a new audit finding (requires authentication and specific role/department)
router.post('/', authenticateJWT, AuditFindingController.create);

// PUT update an audit finding by ID (requires authentication AND authorization check by authorizeFindingModification)
router.put('/:id', authenticateJWT, AuditFindingController.authorizeFindingModification, AuditFindingController.update);

// DELETE an audit finding by ID (requires authentication AND authorization check by authorizeFindingModification)
router.delete('/:id', authenticateJWT, AuditFindingController.authorizeFindingModification, AuditFindingController.delete);

// New Rectification Routes
// Route for assigned user to initiate rectification
router.post('/:id/rectify', authenticateJWT, AuditFindingController.initiateRectification);

// Route for authorized supervisor/director/creator to approve rectification
router.put('/:id/rectify/approve', authenticateJWT, AuditFindingController.authorizeRectificationApproval, AuditFindingController.approveRectification);

// Route for authorized supervisor/director/creator to reject rectification
router.put('/:id/rectify/reject', authenticateJWT, AuditFindingController.authorizeRectificationApproval, AuditFindingController.rejectRectification);

// New: Route for the original submitter to amend a rejected rectification
router.put('/:id/rectify/amend', authenticateJWT, AuditFindingController.authorizeRectificationUpdate, AuditFindingController.updateRectification);

module.exports = router;
