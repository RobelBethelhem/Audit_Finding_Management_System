const express = require('express');
const router = express.Router();
const ReferenceDataController = require('../controllers/ReferenceDataController');
const authenticateJWT = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// Category routes - Admin only for write operations
router.get('/categories', authenticateJWT, ReferenceDataController.getCategories);
router.get('/categories/:id', authenticateJWT, ReferenceDataController.getCategoryById);
router.post('/categories', authenticateJWT, isAdmin, ReferenceDataController.createCategory);
router.put('/categories/:id', authenticateJWT, isAdmin, ReferenceDataController.updateCategory);
router.delete('/categories/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteCategory);

// Risk Level routes - Admin only for write operations
router.get('/risk-levels', authenticateJWT, ReferenceDataController.getRiskLevels);
router.get('/risk-levels/:id', authenticateJWT, ReferenceDataController.getRiskLevelById);
router.post('/risk-levels', authenticateJWT, isAdmin, ReferenceDataController.createRiskLevel);
router.put('/risk-levels/:id', authenticateJWT, isAdmin, ReferenceDataController.updateRiskLevel);
router.delete('/risk-levels/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteRiskLevel);

// Risk Rating routes - Admin only for write operations
router.get('/risk-ratings', authenticateJWT, ReferenceDataController.getRiskRatings);
router.get('/risk-ratings/:id', authenticateJWT, ReferenceDataController.getRiskRatingById);
router.post('/risk-ratings', authenticateJWT, isAdmin, ReferenceDataController.createRiskRating);
router.put('/risk-ratings/:id', authenticateJWT, isAdmin, ReferenceDataController.updateRiskRating);
router.delete('/risk-ratings/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteRiskRating);

// System Vulnerability routes - Admin only for write operations
router.get('/vulnerabilities', authenticateJWT, ReferenceDataController.getSystemVulnerabilities);
router.get('/vulnerabilities/:id', authenticateJWT, ReferenceDataController.getSystemVulnerabilityById);
router.post('/vulnerabilities', authenticateJWT, isAdmin, ReferenceDataController.createSystemVulnerability);
router.put('/vulnerabilities/:id', authenticateJWT, isAdmin, ReferenceDataController.updateSystemVulnerability);
router.delete('/vulnerabilities/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteSystemVulnerability);

// Compliance Gap routes - Admin only for write operations
router.get('/compliance-gaps', authenticateJWT, ReferenceDataController.getComplianceGaps);
router.get('/compliance-gaps/:id', authenticateJWT, ReferenceDataController.getComplianceGapById);
router.post('/compliance-gaps', authenticateJWT, isAdmin, ReferenceDataController.createComplianceGap);
router.put('/compliance-gaps/:id', authenticateJWT, isAdmin, ReferenceDataController.updateComplianceGap);
router.delete('/compliance-gaps/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteComplianceGap);

// Relevant Standard routes - Admin only for write operations
router.get('/standards', authenticateJWT, ReferenceDataController.getRelevantStandards);
router.get('/standards/:id', authenticateJWT, ReferenceDataController.getRelevantStandardById);
router.post('/standards', authenticateJWT, isAdmin, ReferenceDataController.createRelevantStandard);
router.put('/standards/:id', authenticateJWT, isAdmin, ReferenceDataController.updateRelevantStandard);
router.delete('/standards/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteRelevantStandard);

// Business Compliance Gap routes - Admin only for write operations
router.get('/business-compliance-gaps', authenticateJWT, ReferenceDataController.getBusinessComplianceGaps);
router.get('/businesscompliance-gaps/:id', authenticateJWT, ReferenceDataController.getBusinessComplianceGapById);
router.post('/business-compliance-gaps', authenticateJWT, isAdmin, ReferenceDataController.createBusinessComplianceGap);
router.put('/business-compliance-gaps/:id', authenticateJWT, isAdmin, ReferenceDataController.updateBusinessComplianceGap);
router.delete('/business-compliance-gaps/:id', authenticateJWT, isAdmin, ReferenceDataController.deleteBusinessComplianceGap);

module.exports = router;
