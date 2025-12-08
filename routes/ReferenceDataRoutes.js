const express = require('express');
const router = express.Router();
const ReferenceDataController = require('../controllers/ReferenceDataController');
const {authenticate, authorize} = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// Category routes - Admin only for write operations
router.get('/categories', authenticate, ReferenceDataController.getCategories);
router.get('/categories/:id', authenticate, ReferenceDataController.getCategoryById);
router.post('/categories', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.createCategory);
router.put('/categories/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteCategory);

// Risk Level routes - Admin only for write operations
router.get('/risk-levels', authenticate, ReferenceDataController.getRiskLevels);
router.get('/risk-levels/:id', authenticate, ReferenceDataController.getRiskLevelById);
router.post('/risk-levels', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor','IT_Auditors_Director'), ReferenceDataController.createRiskLevel);
router.put('/risk-levels/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateRiskLevel);
router.delete('/risk-levels/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteRiskLevel);

// Risk Rating routes - Admin only for write operations
router.get('/risk-ratings', authenticate, ReferenceDataController.getRiskRatings);
router.get('/risk-ratings/:id', authenticate, ReferenceDataController.getRiskRatingById);
router.post('/risk-ratings', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.createRiskRating);
router.put('/risk-ratings/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateRiskRating);
router.delete('/risk-ratings/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteRiskRating);

// System Vulnerability routes - Admin only for write operations
router.get('/vulnerabilities', authenticate, ReferenceDataController.getSystemVulnerabilities);
router.get('/vulnerabilities/:id', authenticate, ReferenceDataController.getSystemVulnerabilityById);
router.post('/vulnerabilities', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.createSystemVulnerability);
router.put('/vulnerabilities/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateSystemVulnerability);
router.delete('/vulnerabilities/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteSystemVulnerability);

// Compliance Gap routes - Admin only for write operations
router.get('/compliance-gaps', authenticate, ReferenceDataController.getComplianceGaps);
router.get('/compliance-gaps/:id', authenticate, ReferenceDataController.getComplianceGapById);
router.post('/compliance-gaps', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.createComplianceGap);
router.put('/compliance-gaps/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateComplianceGap);
router.delete('/compliance-gaps/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteComplianceGap);

// Relevant Standard routes - Admin only for write operations
router.get('/standards', authenticate, ReferenceDataController.getRelevantStandards);
router.get('/standards/:id', authenticate, ReferenceDataController.getRelevantStandardById);
router.post('/standards', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.createRelevantStandard);
router.put('/standards/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateRelevantStandard);
router.delete('/standards/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteRelevantStandard);

// Business Compliance Gap routes - Admin only for write operations
router.get('/business-compliance-gaps', authenticate, ReferenceDataController.getBusinessComplianceGaps);
router.get('/businesscompliance-gaps/:id', authenticate, ReferenceDataController.getBusinessComplianceGapById);
router.post('/business-compliance-gaps', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.createBusinessComplianceGap);
router.put('/business-compliance-gaps/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.updateBusinessComplianceGap);
router.delete('/business-compliance-gaps/:id', authenticate, authorize('Admin', 'IT_Auditors_Supervisor','Inspection_Auditors_Supervisor','Audit_Supervisor', 'IT_Auditors_Director'), ReferenceDataController.deleteBusinessComplianceGap);

module.exports = router;
