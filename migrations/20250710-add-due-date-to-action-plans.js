'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('action_plans', 'due_date', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'timeline'
    });
    
    // Also make timeline nullable since it's now optional
    await queryInterface.changeColumn('action_plans', 'timeline', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('action_plans', 'due_date');
    
    // Revert timeline to not null
    await queryInterface.changeColumn('action_plans', 'timeline', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
