'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('action_plans', {
      action_plan_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'audit_findings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_plan: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      timeline: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Pending', 'In_Progress', 'Completed', 'Overdue'),
        defaultValue: 'Pending',
        allowNull: false
      },
      submitted_by_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      primary_resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'resources',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      primary_evidence_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'evidences',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      resource_id: {
        type: Sequelize.JSON,
        allowNull: true
      },
      evidence_id: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('action_plans');
  }
};