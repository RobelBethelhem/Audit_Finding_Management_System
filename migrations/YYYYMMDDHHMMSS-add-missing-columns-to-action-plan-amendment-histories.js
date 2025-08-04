'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the columns already exist
    const tableInfo = await queryInterface.describeTable('action_plan_amendment_histories');
    
    const columnsToAdd = [];
    
    if (!tableInfo.resource_id) {
      columnsToAdd.push(
        queryInterface.addColumn('action_plan_amendment_histories', 'resource_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'resources',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        })
      );
    }
    
    if (!tableInfo.evidence_id) {
      columnsToAdd.push(
        queryInterface.addColumn('action_plan_amendment_histories', 'evidence_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'evidences',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        })
      );
    }
    
    return Promise.all(columnsToAdd);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('action_plan_amendment_histories', 'resource_id'),
      queryInterface.removeColumn('action_plan_amendment_histories', 'evidence_id')
    ]);
  }
};