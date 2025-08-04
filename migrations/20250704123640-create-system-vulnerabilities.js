'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('system_vulnerabilities', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      vulnerability_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vulnerability_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      severity_level: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
        allowNull: false,
        defaultValue: 'Medium'
      },
      affected_systems: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('system_vulnerabilities', ['vulnerability_name'], {
      name: 'idx_vulnerability_name'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('system_vulnerabilities');
  }
};

