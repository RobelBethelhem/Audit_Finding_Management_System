'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('relevant_standards', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      standard_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      standard_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      issuing_body: {
        type: Sequelize.STRING,
        allowNull: true
      },
      version: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('relevant_standards', ['standard_name'], {
      name: 'idx_standard_name'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('relevant_standards');
  }
};