'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_finding_assigned', 'assigned_by_id', {
      type: Sequelize.UUID,
      allowNull: true, // Initially allow null for existing records
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Create index for the new column
    await queryInterface.addIndex('audit_finding_assigned', ['assigned_by_id'], {
      name: 'idx_audit_finding_assigned_by_user'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('audit_finding_assigned', 'idx_audit_finding_assigned_by_user');
    await queryInterface.removeColumn('audit_finding_assigned', 'assigned_by_id');
  }
};