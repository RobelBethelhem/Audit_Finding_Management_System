'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting removal of branch_supervisor_id from audit_finding_branch_assignments...');
      
      // Step 1: Remove the foreign key constraint
      try {
        await queryInterface.removeConstraint(
          'audit_finding_branch_assignments', 
          'fk_afba_supervisor'
        );
        console.log('✅ Removed foreign key constraint fk_afba_supervisor');
      } catch (error) {
        console.warn('⚠️ Foreign key constraint fk_afba_supervisor may not exist:', error.message);
      }

      // Step 2: Remove the index
      try {
        await queryInterface.removeIndex(
          'audit_finding_branch_assignments',
          'idx_audit_finding_branch_assignments_supervisor'
        );
        console.log('✅ Removed index idx_audit_finding_branch_assignments_supervisor');
      } catch (error) {
        console.warn('⚠️ Index idx_audit_finding_branch_assignments_supervisor may not exist:', error.message);
      }

      // Step 3: Remove the column
      await queryInterface.removeColumn(
        'audit_finding_branch_assignments',
        'branch_supervisor_id'
      );
      console.log('✅ Removed branch_supervisor_id column');

      console.log('✅ Migration completed successfully - branch_supervisor_id removed from audit_finding_branch_assignments');

    } catch (error) {
      console.error('❌ Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Rolling back removal of branch_supervisor_id...');
      
      // Step 1: Add the column back
      await queryInterface.addColumn('audit_finding_branch_assignments', 'branch_supervisor_id', {
        type: Sequelize.CHAR(36),
        allowNull: true,
        after: 'branch_assigned_at'
      });
      console.log('✅ Added branch_supervisor_id column back');

      // Step 2: Add the index back
      await queryInterface.addIndex('audit_finding_branch_assignments', ['branch_supervisor_id'], {
        name: 'idx_audit_finding_branch_assignments_supervisor'
      });
      console.log('✅ Added index idx_audit_finding_branch_assignments_supervisor back');

      // Step 3: Add the foreign key constraint back
      await queryInterface.addConstraint('audit_finding_branch_assignments', {
        fields: ['branch_supervisor_id'],
        type: 'foreign key',
        name: 'fk_afba_supervisor',
        references: {
          table: 'users',
          field: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('✅ Added foreign key constraint fk_afba_supervisor back');

      console.log('✅ Rollback completed successfully');

    } catch (error) {
      console.error('❌ Error in rollback:', error);
      throw error;
    }
  }
};
