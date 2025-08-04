'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('action_plans');
      
      // Remove resource_id and evidence_id if they exist
      if (tableInfo.resource_id) {
        await queryInterface.removeColumn('action_plans', 'resource_id');
      }
      
      if (tableInfo.evidence_id) {
        await queryInterface.removeColumn('action_plans', 'evidence_id');
      }
    } catch (error) {
      console.error('Error in migration:', error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('action_plans');
      
      // Add back resource_id and evidence_id
      if (!tableInfo.resource_id) {
        await queryInterface.addColumn('action_plans', 'resource_id', {
          type: Sequelize.UUID,
          allowNull: true
        });
      }
      
      if (!tableInfo.evidence_id) {
        await queryInterface.addColumn('action_plans', 'evidence_id', {
          type: Sequelize.UUID,
          allowNull: true
        });
      }
    } catch (error) {
      console.error('Error in down migration:', error);
    }
  }
};