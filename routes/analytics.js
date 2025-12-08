const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const {authenticate, authorize} = require('../middleware/auth');

// Apply authentication middleware to all analytics routes
router.use(authenticate);

// Audit Findings Analytics Routes
router.get('/audit-findings/status', AnalyticsController.getAuditFindingsByStatus);
router.get('/audit-findings/risk-level', AnalyticsController.getAuditFindingsByRiskLevel);
router.get('/audit-findings/department', AnalyticsController.getAuditFindingsByDepartment);
router.get('/audit-findings/trends', AnalyticsController.getAuditFindingsTrends);

// Action Plan Analytics Routes
router.get('/action-plans/metrics', AnalyticsController.getActionPlanMetrics);

// Escalation Analytics Routes
router.get('/escalations/trends', AnalyticsController.getEscalationTrends);

// User Workload Analytics Routes
router.get('/users/workload', AnalyticsController.getUserWorkloadDistribution);

// Compliance Analytics Routes
router.get('/compliance/gaps', AnalyticsController.getComplianceGapAnalysis);

// Timeline Analytics Routes
router.get('/timeline/analytics', AnalyticsController.getTimelineAnalytics);

// Dashboard Data Route (comprehensive data for dashboard)
router.get('/dashboard', AnalyticsController.getDashboardData);

module.exports = router;
