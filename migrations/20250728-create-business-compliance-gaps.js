'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bussiness_compliance_gaps', {
      id: {
       type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('bussiness_compliance_gaps', ['gap_name'], {
      name: 'idx_gap_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bussiness_compliance_gaps');
  }
};
