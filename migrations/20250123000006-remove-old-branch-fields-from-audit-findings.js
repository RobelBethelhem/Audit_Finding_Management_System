'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Removing old branch assignment fields from audit_findings table...');
      
      // Remove indexes first (if they exist)
      try {
        await queryInterface.removeIndex('audit_findings', 'idx_audit_findings_assigned_branch');
        console.log('Removed index for assigned_branch_id');
      } catch (error) {
        console.log('Index idx_audit_findings_assigned_branch does not exist, skipping...');
      }

      try {
        await queryInterface.removeIndex('audit_findings', 'idx_audit_findings_branch_supervisor');
        console.log('Removed index for branch_supervisor_id');
      } catch (error) {
        console.log('Index idx_audit_findings_branch_supervisor does not exist, skipping...');
      }

      try {
        await queryInterface.removeIndex('audit_findings', 'idx_audit_findings_branch_assigned_by');
        console.log('Removed index for branch_assigned_by_id');
      } catch (error) {
        console.log('Index idx_audit_findings_branch_assigned_by does not exist, skipping...');
      }

      // Remove foreign key constraints (if they exist)
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE audit_findings 
          DROP FOREIGN KEY IF EXISTS fk_audit_findings_assigned_branch
        `);
        console.log('Removed foreign key for assigned_branch_id');
      } catch (error) {
        console.log('Foreign key fk_audit_findings_assigned_branch does not exist, skipping...');
      }

      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE audit_findings 
          DROP FOREIGN KEY IF EXISTS fk_audit_findings_branch_supervisor
        `);
        console.log('Removed foreign key for branch_supervisor_id');
      } catch (error) {
        console.log('Foreign key fk_audit_findings_branch_supervisor does not exist, skipping...');
      }

      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE audit_findings 
          DROP FOREIGN KEY IF EXISTS fk_audit_findings_branch_assigned_by
        `);
        console.log('Removed foreign key for branch_assigned_by_id');
      } catch (error) {
        console.log('Foreign key fk_audit_findings_branch_assigned_by does not exist, skipping...');
      }

      // Remove columns
      try {
        await queryInterface.removeColumn('audit_findings', 'assigned_branch_id');
        console.log('Removed assigned_branch_id column');
      } catch (error) {
        console.log('Column assigned_branch_id does not exist, skipping...');
      }

      try {
        await queryInterface.removeColumn('audit_findings', 'branch_assigned_by_id');
        console.log('Removed branch_assigned_by_id column');
      } catch (error) {
        console.log('Column branch_assigned_by_id does not exist, skipping...');
      }

      try {
        await queryInterface.removeColumn('audit_findings', 'branch_assigned_at');
        console.log('Removed branch_assigned_at column');
      } catch (error) {
        console.log('Column branch_assigned_at does not exist, skipping...');
      }

      try {
        await queryInterface.removeColumn('audit_findings', 'branch_supervisor_id');
        console.log('Removed branch_supervisor_id column');
      } catch (error) {
        console.log('Column branch_supervisor_id does not exist, skipping...');
      }

      console.log('Successfully removed old branch assignment fields from audit_findings table');

    } catch (error) {
      console.error('Error removing old branch fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Re-adding old branch assignment fields to audit_findings table...');
      
      // Re-add the columns for rollback
      await queryInterface.addColumn('audit_findings', 'assigned_branch_id', {
        type: Sequelize.CHAR(36),
        allowNull: true
      });

      await queryInterface.addColumn('audit_findings', 'branch_assigned_by_id', {
        type: Sequelize.CHAR(36),
        allowNull: true
      });

      await queryInterface.addColumn('audit_findings', 'branch_assigned_at', {
        type: Sequelize.DATE,
        allowNull: true
      });

      await queryInterface.addColumn('audit_findings', 'branch_supervisor_id', {
        type: Sequelize.CHAR(36),
        allowNull: true
      });

      console.log('Re-added old branch assignment fields');

    } catch (error) {
      console.error('Error re-adding old branch fields:', error);
      throw error;
    }
  }
};
