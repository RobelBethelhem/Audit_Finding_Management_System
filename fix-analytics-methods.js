const fs = require('fs');

// Read the analytics controller file
const filePath = './controllers/AnalyticsController.js';
let content = fs.readFileSync(filePath, 'utf8');

// List of methods to fix (convert from async method() to method = async () =>)
const methodsToFix = [
  'getAuditFindingsByDepartment',
  'getAuditFindingsTrends',
  'getActionPlanMetrics',
  'getEscalationTrends',
  'getUserWorkloadDistribution',
  'getComplianceGapAnalysis',
  'getTimelineAnalytics',
  'getDashboardData',
  'getStatusStatsData',
  'getRiskLevelStatsData',
  'getDepartmentStatsData',
  'getActionPlanStatsData',
  'getEscalationCountData',
  'getWorkloadStatsData',
  'getTimelineStatsData'
];

// Fix each method
methodsToFix.forEach(methodName => {
  const oldPattern = new RegExp(`async ${methodName}\\(`, 'g');
  const newPattern = `${methodName} = async (`;
  content = content.replace(oldPattern, newPattern);
});

// Write the fixed content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed all analytics controller methods!');
console.log('Methods fixed:', methodsToFix.length);
