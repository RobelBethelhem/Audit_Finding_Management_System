'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the columns already exist
    const tableInfo = await queryInterface.describeTable('action_plans');
    
    const promises = [];
    
    if (!tableInfo.resource_id) {
      promises.push(
        queryInterface.addColumn('action_plans', 'resource_id', {
          type: Sequelize.JSON,
          allowNull: true
        })
      );
    }
    
    if (!tableInfo.evidence_id) {
      promises.push(
        queryInterface.addColumn('action_plans', 'evidence_id', {
          type: Sequelize.JSON,
          allowNull: true
        })
      );
    }
    
    return Promise.all(promises);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('action_plans', 'resource_id'),
      queryInterface.removeColumn('action_plans', 'evidence_id')
    ]);
  }
};