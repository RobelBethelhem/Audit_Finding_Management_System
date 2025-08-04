-- Rollback script for failed migrations
-- Run this if you need to clean up after failed migration attempts

-- Drop tables if they exist (in reverse order due to foreign keys)
DROP TABLE IF EXISTS `audit_finding_branch_assignments`;
DROP TABLE IF EXISTS `inspector_branch_assignments`;
DROP TABLE IF EXISTS `test_branch_assignments`;

-- Remove any partial indexes that might have been created
-- (These commands will fail silently if indexes don't exist)
ALTER TABLE `audit_findings` DROP INDEX IF EXISTS `idx_audit_findings_reference_number`;
ALTER TABLE `audit_findings` DROP INDEX IF EXISTS `idx_audit_findings_created_at`;

-- Remove reference_number column if it was added
ALTER TABLE `audit_findings` DROP COLUMN IF EXISTS `reference_number`;

-- Check what migrations have been run
SELECT * FROM SequelizeMeta ORDER BY name;
