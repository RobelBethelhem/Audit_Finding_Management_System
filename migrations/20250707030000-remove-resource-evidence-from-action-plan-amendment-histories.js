'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('action_plan_amendment_histories');
      
      // Remove resource_id and evidence_id if they exist
      if (tableInfo.resource_id) {
        await queryInterface.removeColumn('action_plan_amendment_histories', 'resource_id');
      }
      
      if (tableInfo.evidence_id) {
        await queryInterface.removeColumn('action_plan_amendment_histories', 'evidence_id');
      }
    } catch (error) {
      console.error('Error in migration:', error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('action_plan_amendment_histories');
      
      // Add back resource_id and evidence_id
      if (!tableInfo.resource_id) {
        await queryInterface.addColumn('action_plan_amendment_histories', 'resource_id', {
          type: Sequelize.JSON,
          allowNull: true
        });
      }
      
      if (!tableInfo.evidence_id) {
        await queryInterface.addColumn('action_plan_amendment_histories', 'evidence_id', {
          type: Sequelize.JSON,
          allowNull: true
        });
      }
    } catch (error) {
      console.error('Error in down migration:', error);
    }
  }
};