'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add progress tracking fields to action_plans table
    await queryInterface.addColumn('action_plans', 'progress_percentage', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    });

    await queryInterface.addColumn('action_plans', 'progress_justification', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add progress tracking fields to action_plan_amendment_histories table
    await queryInterface.addColumn('action_plan_amendment_histories', 'progress_percentage', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    });

    await queryInterface.addColumn('action_plan_amendment_histories', 'progress_justification', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove progress tracking fields from action_plans table
    await queryInterface.removeColumn('action_plans', 'progress_percentage');
    await queryInterface.removeColumn('action_plans', 'progress_justification');

    // Remove progress tracking fields from action_plan_amendment_histories table
    await queryInterface.removeColumn('action_plan_amendment_histories', 'progress_percentage');
    await queryInterface.removeColumn('action_plan_amendment_histories', 'progress_justification');
  }
};
