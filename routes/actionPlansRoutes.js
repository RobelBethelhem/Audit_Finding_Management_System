const express = require('express');
const router = express.Router();
const ActionPlanController = require('../controllers/ActionPlanController');
const  authenticateJWT  = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const resourcesDir = 'uploads/action-plans/resources';
const evidencesDir = 'uploads/action-plans/evidences';

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

if (!fs.existsSync(evidencesDir)) {
  fs.mkdirSync(evidencesDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on fieldname
    if (file.fieldname === 'resource' || file.fieldname === 'resource_files') {
      cb(null, resourcesDir);
    } else if (file.fieldname === 'evidence' || file.fieldname === 'evidence_files') {
      cb(null, evidencesDir);
    } else {
      cb(null, 'uploads/action-plans/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only the following filetypes are allowed: ' + filetypes));
  }
});

// Configure fields for file uploads - supporting multiple files
const uploadFields = [
  { name: 'resource', maxCount: 1 }, // Legacy single file support
  { name: 'evidence', maxCount: 1 }, // Legacy single file support
  { name: 'resource_files', maxCount: 10 }, // Multiple resource files
  { name: 'evidence_files', maxCount: 10 } // Multiple evidence files
];

// Routes for Action Plans
// GET all action plans
router.get('/', authenticateJWT, ActionPlanController.findAll);

// GET a single action plan by ID
router.get('/:id', authenticateJWT, ActionPlanController.findById);

// POST create a new action plan (requires authentication and specific authorization within the controller)
router.post('/', authenticateJWT, upload.fields(uploadFields), ActionPlanController.create);

// PUT update an action plan (requires authentication and authorization)
router.put('/:id', authenticateJWT, upload.fields(uploadFields), ActionPlanController.authorizeActionPlanAccess, ActionPlanController.updateActionPlan);

// PUT update action plan status (requires authentication and specific status change authorization)
router.put('/:id/status', authenticateJWT, ActionPlanController.authorizeActionPlanStatusChange, ActionPlanController.updateActionPlanStatus);

// PUT update action plan progress (requires authentication and authorization)
router.put('/:id/progress', authenticateJWT, ActionPlanController.authorizeActionPlanAccess, ActionPlanController.updateActionPlanProgress);

// GET amendment history for an action plan
router.get('/:id/history', authenticateJWT, ActionPlanController.authorizeActionPlanAccess, ActionPlanController.getAmendmentHistory);

// GET download evidence file by evidence ID
router.get('/evidence/:evidenceId/download', authenticateJWT, ActionPlanController.downloadEvidence);

// GET download resource file by resource ID
router.get('/resource/:resourceId/download', authenticateJWT, ActionPlanController.downloadResource);

module.exports = router;
