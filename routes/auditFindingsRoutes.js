const express = require('express');
const router = express.Router();
const AuditFindingController = require('../controllers/AuditFindingController');
const {authenticate, authorize}  = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only the following filetypes are allowed: ' + filetypes));
  }
});

router.get('/NBE_Report', authenticate, AuditFindingController.getAuditFindingsReport);
router.post('/audit-findings/export-word-with-attachments',authenticate, AuditFindingController.exportNBEReportWithAttachments);


// Routes requiring authentication and authorization
// GET all audit findings (requires authentication, then can filter by user's access)
router.get('/', authenticate, AuditFindingController.findAll);

// GET a single audit finding by ID (requires authentication)
router.get('/:id', authenticate, AuditFindingController.findById);

// IMPORTANT: This route must come AFTER the /:id route to avoid conflicts
// GET all audit findings created by the logged-in user
router.get('/my-created-findings', authenticate, AuditFindingController.getMyCreatedFindings);

// POST create a new audit finding (requires authentication and specific role/department)
// Added multer middleware to handle multipart/form-data with evidence files
router.post('/', authenticate, upload.array('evidence_files', 10), AuditFindingController.create);

// PUT update an audit finding by ID (requires authentication AND authorization check by authorizeFindingModification)
// Added multer middleware to handle multipart/form-data with evidence files
router.put('/:id', authenticate, AuditFindingController.authorizeFindingModification, upload.array('evidence_files', 10), AuditFindingController.update);

// DELETE an audit finding by ID (requires authentication AND authorization check by authorizeFindingModification)
router.delete('/:id', authenticate, AuditFindingController.authorizeFindingModification, AuditFindingController.delete);

// New Rectification Routes
// Route for assigned user to initiate rectification
router.post('/:id/rectify', authenticate, upload.single('file'), AuditFindingController.initiateRectification);

// Route for authorized supervisor/director/creator to approve rectification
router.put('/:id/rectify/approve', authenticate, AuditFindingController.authorizeRectificationApproval, AuditFindingController.approveRectification);

// Route for authorized supervisor/director/creator to reject rectification
router.put('/:id/rectify/reject', authenticate, AuditFindingController.authorizeRectificationApproval, AuditFindingController.rejectRectification);

// New: Route for the original submitter to amend a rejected rectification
router.put('/:id/rectify/amend', authenticate, upload.single('file'), AuditFindingController.authorizeRectificationUpdate, AuditFindingController.updateRectification);

// GET download rectification evidence file by evidence ID
router.get('/rectification-evidence/:evidenceId/download', authenticate, AuditFindingController.downloadRectificationEvidence);

// Evidence file management routes
// POST upload evidence files for audit finding
router.post('/:id/evidence', authenticate, upload.array('files', 10), AuditFindingController.uploadEvidence);

// GET download evidence file by evidence ID
router.get('/evidence/:evidenceId/download', authenticate, AuditFindingController.downloadEvidence);

// PUT deactivate evidence file (soft delete for audit trail)
router.put('/evidence/:evidenceId/deactivate', authenticate, AuditFindingController.deactivateEvidence);





module.exports = router;
