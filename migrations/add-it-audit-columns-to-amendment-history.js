'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_amendment_histories', 'vulnerability_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'system_vulnerabilities',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('audit_amendment_histories', 'compliance_gap_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'compliance_gaps',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('audit_amendment_histories', 'standard_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'relevant_standards',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addIndex('audit_amendment_histories', ['vulnerability_id'], {
      name: 'idx_amendment_vulnerability'
    });
    
    await queryInterface.addIndex('audit_amendment_histories', ['compliance_gap_id'], {
      name: 'idx_amendment_compliance_gap'
    });
    
    await queryInterface.addIndex('audit_amendment_histories', ['standard_id'], {
      name: 'idx_amendment_standard'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('audit_amendment_histories', 'idx_amendment_vulnerability');
    await queryInterface.removeIndex('audit_amendment_histories', 'idx_amendment_compliance_gap');
    await queryInterface.removeIndex('audit_amendment_histories', 'idx_amendment_standard');
    
    await queryInterface.removeColumn('audit_amendment_histories', 'vulnerability_id');
    await queryInterface.removeColumn('audit_amendment_histories', 'compliance_gap_id');
    await queryInterface.removeColumn('audit_amendment_histories', 'standard_id');
  }
};