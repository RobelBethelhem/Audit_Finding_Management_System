-- Clean up failed migration attempts
-- Run this before running the new migrations

-- Drop any existing tables from failed attempts
DROP TABLE IF EXISTS `audit_finding_branch_assignments`;
DROP TABLE IF EXISTS `inspector_branch_assignments`;
DROP TABLE IF EXISTS `test_branch_assignments`;

-- Remove failed migration entries from SequelizeMeta
DELETE FROM SequelizeMeta WHERE name IN (
  '20250123000000-test-table-creation.js',
  '20250123000001-create-audit-finding-branch-assignments.js',
  '20250123000001-create-audit-finding-branch-assignments-v2.js',
  '20250123000002-create-inspector-branch-assignments.js',
  '20250123000003-add-reference-number-to-audit-findings.js'
);

-- Check what migrations are currently recorded
SELECT * FROM SequelizeMeta ORDER BY name;
