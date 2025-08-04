'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
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
        type: Sequelize.JSON,
        allowNull: true
      },
      evidence_id: {
        type: Sequelize.JSON,
        allowNull: true
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
    await queryInterface.dropTable('action_plan_amendment_histories');
  }
};