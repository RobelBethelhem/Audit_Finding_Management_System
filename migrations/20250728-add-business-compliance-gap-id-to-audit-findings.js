'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_findings', 'business_compliance_gap_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'bussiness_compliance_gaps',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('audit_findings', 'business_compliance_gap_id');
  }
};
