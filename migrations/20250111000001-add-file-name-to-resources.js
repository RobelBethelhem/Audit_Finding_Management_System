'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('resources', 'file_name', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'file_path'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('resources', 'file_name');
  }
};
