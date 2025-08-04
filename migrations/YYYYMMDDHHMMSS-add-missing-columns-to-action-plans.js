'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the columns already exist
    const tableInfo = await queryInterface.describeTable('action_plans');
    
    const columnsToAdd = [];
    
    if (!tableInfo.resource_id) {
      columnsToAdd.push(
        queryInterface.addColumn('action_plans', 'resource_id', {
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
        queryInterface.addColumn('action_plans', 'evidence_id', {
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
      queryInterface.removeColumn('action_plans', 'resource_id'),
      queryInterface.removeColumn('action_plans', 'evidence_id')
    ]);
  }
};