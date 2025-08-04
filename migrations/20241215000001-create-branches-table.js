'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('branches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      branch_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      branch_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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

    // Add indexes
    await queryInterface.addIndex('branches', ['branch_code'], {
      unique: true,
      name: 'unique_branch_code'
    });

    await queryInterface.addIndex('branches', ['is_active'], {
      name: 'idx_branches_is_active'
    });

    await queryInterface.addIndex('branches', ['branch_name'], {
      name: 'idx_branches_branch_name'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('branches');
  }
};
