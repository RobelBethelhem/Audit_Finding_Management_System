'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Change risk_level_id to allowNull: true
    await queryInterface.changeColumn('audit_findings', 'risk_level_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // Change amount to allowNull: true
    await queryInterface.changeColumn('audit_findings', 'amount', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert risk_level_id back to allowNull: false
    await queryInterface.changeColumn('audit_findings', 'risk_level_id', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    // Revert amount back to allowNull: false
    await queryInterface.changeColumn('audit_findings', 'amount', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
  }
};
