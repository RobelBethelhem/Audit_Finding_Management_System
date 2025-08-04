'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, check if the table exists
    try {
      await queryInterface.describeTable('action_plan_amendment_histories');
    } catch (error) {
      // Table doesn't exist, create it
      await queryInterface.createTable('action_plan_amendment_histories', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        action_plan_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'action_plans',
            key: 'action_plan_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        amend_by_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        action_plan: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        responsible_persons_id: {
          type: Sequelize.JSON,
          allowNull: true
        },
        timeline: {
          type: Sequelize.DATE,
          allowNull: true
        },
        resource_id: {
          type: Sequelize.UUID,
          allowNull: true
          // Remove foreign key constraint for now
        },
        evidence_id: {
          type: Sequelize.UUID,
          allowNull: true
          // Remove foreign key constraint for now
        },
        status: {
          type: Sequelize.STRING,
          allowNull: true
        },
        changes: {
          type: Sequelize.JSON,
          allowNull: true
        },
        amended_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      });
      return;
    }

    // Table exists, check and modify columns as needed
    const tableInfo = await queryInterface.describeTable('action_plan_amendment_histories');
    
    // Check if created_at and updated_at exist and remove them if they do
    if (tableInfo.created_at) {
      await queryInterface.removeColumn('action_plan_amendment_histories', 'created_at');
    }
    
    if (tableInfo.updated_at) {
      await queryInterface.removeColumn('action_plan_amendment_histories', 'updated_at');
    }
    
    // Check and update resource_id and evidence_id if they exist but are wrong type
    if (tableInfo.resource_id && tableInfo.resource_id.type.toLowerCase() !== 'char(36)') {
      await queryInterface.changeColumn('action_plan_amendment_histories', 'resource_id', {
        type: Sequelize.UUID,
        allowNull: true
        // Remove foreign key constraint for now
      });
    }
    
    if (tableInfo.evidence_id && tableInfo.evidence_id.type.toLowerCase() !== 'char(36)') {
      await queryInterface.changeColumn('action_plan_amendment_histories', 'evidence_id', {
        type: Sequelize.UUID,
        allowNull: true
        // Remove foreign key constraint for now
      });
    }
    
    // Add columns if they don't exist
    if (!tableInfo.resource_id) {
      await queryInterface.addColumn('action_plan_amendment_histories', 'resource_id', {
        type: Sequelize.UUID,
        allowNull: true
        // Remove foreign key constraint for now
      });
    }
    
    if (!tableInfo.evidence_id) {
      await queryInterface.addColumn('action_plan_amendment_histories', 'evidence_id', {
        type: Sequelize.UUID,
        allowNull: true
        // Remove foreign key constraint for now
      });
    }
    
    // Now let's check if the referenced tables exist before adding foreign keys
    try {
      // Check if resources table exists
      await queryInterface.describeTable('resources');
      
      // Add foreign key for resource_id if resources table exists
      await queryInterface.sequelize.query(`
        ALTER TABLE action_plan_amendment_histories 
        DROP FOREIGN KEY IF EXISTS action_plan_amendment_histories_resource_id_foreign;
      `).catch(err => console.log('No foreign key to drop for resource_id'));
      
      await queryInterface.sequelize.query(`
        ALTER TABLE action_plan_amendment_histories 
        ADD CONSTRAINT action_plan_amendment_histories_resource_id_foreign 
        FOREIGN KEY (resource_id) REFERENCES resources(id) 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `).catch(err => console.log('Could not add foreign key for resource_id:', err.message));
    } catch (error) {
      console.log('Resources table does not exist, skipping foreign key');
    }
    
    try {
      // Check if evidences table exists
      await queryInterface.describeTable('evidences');
      
      // Add foreign key for evidence_id if evidences table exists
      await queryInterface.sequelize.query(`
        ALTER TABLE action_plan_amendment_histories 
        DROP FOREIGN KEY IF EXISTS action_plan_amendment_histories_evidence_id_foreign;
      `).catch(err => console.log('No foreign key to drop for evidence_id'));
      
      await queryInterface.sequelize.query(`
        ALTER TABLE action_plan_amendment_histories 
        ADD CONSTRAINT action_plan_amendment_histories_evidence_id_foreign 
        FOREIGN KEY (evidence_id) REFERENCES evidences(id) 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `).catch(err => console.log('Could not add foreign key for evidence_id:', err.message));
    } catch (error) {
      console.log('Evidences table does not exist, skipping foreign key');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This is a risky migration to revert, so we'll just add back the timestamp columns
    // but we won't try to convert UUID columns back to JSON
    try {
      const tableInfo = await queryInterface.describeTable('action_plan_amendment_histories');
      
      if (!tableInfo.created_at) {
        await queryInterface.addColumn('action_plan_amendment_histories', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }
      
      if (!tableInfo.updated_at) {
        await queryInterface.addColumn('action_plan_amendment_histories', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }
    } catch (error) {
      console.error('Error in down migration:', error);
    }
  }
};
