'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('compliance_gaps', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      gap_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gap_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      regulatory_impact: {
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

    await queryInterface.addIndex('compliance_gaps', ['gap_name'], {
      name: 'idx_gap_name'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('compliance_gaps');
  }
};