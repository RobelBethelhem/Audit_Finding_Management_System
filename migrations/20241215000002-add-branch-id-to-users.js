'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add branch_id column to users table
    await queryInterface.addColumn('users', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for branch_id
    await queryInterface.addIndex('users', ['branch_id'], {
      name: 'idx_users_branch_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('users', 'idx_users_branch_id');
    
    // Remove column
    await queryInterface.removeColumn('users', 'branch_id');
  }
};
