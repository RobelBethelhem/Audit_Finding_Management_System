'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting normalized branch assignments migration...');
      
      // First, drop the existing table if it exists (from failed attempts)
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS audit_finding_branch_assignments`);
      console.log('Cleaned up existing table');

      // Create the normalized table with correct CHAR(36) types to match existing tables
      await queryInterface.createTable('audit_finding_branch_assignments', {
        assignment_id: {
          type: Sequelize.CHAR(36),
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4
        },
        audit_finding_id: {
          type: Sequelize.CHAR(36),
          allowNull: false
        },
        assigned_branch_id: {
          type: Sequelize.CHAR(36),
          allowNull: false
        },
        branch_assigned_by_id: {
          type: Sequelize.CHAR(36),
          allowNull: true
        },
        branch_assigned_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        branch_supervisor_id: {
          type: Sequelize.CHAR(36),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });
      console.log('Created audit_finding_branch_assignments table');

      // Create indexes
      await queryInterface.addIndex('audit_finding_branch_assignments', ['audit_finding_id'], {
        name: 'idx_audit_finding_branch_assignments_finding'
      });

      await queryInterface.addIndex('audit_finding_branch_assignments', ['assigned_branch_id'], {
        name: 'idx_audit_finding_branch_assignments_branch'
      });

      await queryInterface.addIndex('audit_finding_branch_assignments', ['branch_supervisor_id'], {
        name: 'idx_audit_finding_branch_assignments_supervisor'
      });

      await queryInterface.addIndex('audit_finding_branch_assignments', ['branch_assigned_by_id'], {
        name: 'idx_audit_finding_branch_assignments_assigned_by'
      });

      // Unique constraint to prevent duplicate assignments
      await queryInterface.addIndex('audit_finding_branch_assignments', ['audit_finding_id'], {
        unique: true,
        name: 'idx_audit_finding_branch_assignments_unique_finding'
      });
      console.log('Created indexes');

      // Add foreign key constraints with proper error handling
      try {
        await queryInterface.addConstraint('audit_finding_branch_assignments', {
          fields: ['audit_finding_id'],
          type: 'foreign key',
          name: 'fk_afba_finding',
          references: {
            table: 'audit_findings',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        });
        console.log('Added foreign key for audit_finding_id');
      } catch (error) {
        console.error('Failed to add foreign key for audit_finding_id:', error.message);
      }

      try {
        await queryInterface.addConstraint('audit_finding_branch_assignments', {
          fields: ['assigned_branch_id'],
          type: 'foreign key',
          name: 'fk_afba_branch',
          references: {
            table: 'branches',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        });
        console.log('Added foreign key for assigned_branch_id');
      } catch (error) {
        console.error('Failed to add foreign key for assigned_branch_id:', error.message);
      }

      try {
        await queryInterface.addConstraint('audit_finding_branch_assignments', {
          fields: ['branch_assigned_by_id'],
          type: 'foreign key',
          name: 'fk_afba_assigned_by',
          references: {
            table: 'users',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('Added foreign key for branch_assigned_by_id');
      } catch (error) {
        console.error('Failed to add foreign key for branch_assigned_by_id:', error.message);
      }

      try {
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
        console.log('Added foreign key for branch_supervisor_id');
      } catch (error) {
        console.error('Failed to add foreign key for branch_supervisor_id:', error.message);
      }

      console.log('Migration completed successfully');

    } catch (error) {
      console.error('Error in normalized branch assignments migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Rolling back normalized branch assignments migration...');
      await queryInterface.dropTable('audit_finding_branch_assignments');
      console.log('Dropped audit_finding_branch_assignments table');
    } catch (error) {
      console.error('Error rolling back migration:', error);
      throw error;
    }
  }
};
