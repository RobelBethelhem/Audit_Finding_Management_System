'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Creating inspector_branch_assignments table...');
      
      // Create inspector_branch_assignments table with correct CHAR(36) types
      await queryInterface.createTable('inspector_branch_assignments', {
        assignment_id: {
          type: Sequelize.CHAR(36),
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4
        },
        inspector_id: {
          type: Sequelize.CHAR(36),
          allowNull: false
        },
        branch_id: {
          type: Sequelize.CHAR(36),
          allowNull: false
        },
        start_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        assigned_by_id: {
          type: Sequelize.CHAR(36),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
      console.log('Created inspector_branch_assignments table');

      // Create indexes
      await queryInterface.addIndex('inspector_branch_assignments', ['inspector_id'], {
        name: 'idx_inspector_branch_assignments_inspector'
      });

      await queryInterface.addIndex('inspector_branch_assignments', ['branch_id'], {
        name: 'idx_inspector_branch_assignments_branch'
      });

      await queryInterface.addIndex('inspector_branch_assignments', ['assigned_by_id'], {
        name: 'idx_inspector_branch_assignments_assigned_by'
      });

      await queryInterface.addIndex('inspector_branch_assignments', ['is_active'], {
        name: 'idx_inspector_branch_assignments_active'
      });

      await queryInterface.addIndex('inspector_branch_assignments', ['start_date', 'end_date'], {
        name: 'idx_inspector_branch_assignments_dates'
      });

      // Composite index for active assignments
      await queryInterface.addIndex('inspector_branch_assignments', ['inspector_id', 'is_active'], {
        name: 'idx_inspector_branch_assignments_inspector_active'
      });
      console.log('Created indexes');

      // Add foreign key constraints
      try {
        await queryInterface.addConstraint('inspector_branch_assignments', {
          fields: ['inspector_id'],
          type: 'foreign key',
          name: 'fk_iba_inspector',
          references: {
            table: 'users',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        });
        console.log('Added foreign key for inspector_id');
      } catch (error) {
        console.error('Failed to add foreign key for inspector_id:', error.message);
      }

      try {
        await queryInterface.addConstraint('inspector_branch_assignments', {
          fields: ['branch_id'],
          type: 'foreign key',
          name: 'fk_iba_branch',
          references: {
            table: 'branches',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        });
        console.log('Added foreign key for branch_id');
      } catch (error) {
        console.error('Failed to add foreign key for branch_id:', error.message);
      }

      try {
        await queryInterface.addConstraint('inspector_branch_assignments', {
          fields: ['assigned_by_id'],
          type: 'foreign key',
          name: 'fk_iba_assigned_by',
          references: {
            table: 'users',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('Added foreign key for assigned_by_id');
      } catch (error) {
        console.error('Failed to add foreign key for assigned_by_id:', error.message);
      }

      console.log('Inspector branch assignments migration completed successfully');

    } catch (error) {
      console.error('Error creating inspector_branch_assignments table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Dropping inspector_branch_assignments table...');
      await queryInterface.dropTable('inspector_branch_assignments');
      console.log('Dropped inspector_branch_assignments table');
    } catch (error) {
      console.error('Error dropping inspector_branch_assignments table:', error);
      throw error;
    }
  }
};
