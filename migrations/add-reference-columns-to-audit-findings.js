'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_findings', 'vulnerability_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'system_vulnerabilities',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('audit_findings', 'compliance_gap_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'compliance_gaps',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('audit_findings', 'standard_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'relevant_standards',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addIndex('audit_findings', ['vulnerability_id'], {
      name: 'idx_audit_finding_vulnerability'
    });
    
    await queryInterface.addIndex('audit_findings', ['compliance_gap_id'], {
      name: 'idx_audit_finding_compliance_gap'
    });
    
    await queryInterface.addIndex('audit_findings', ['standard_id'], {
      name: 'idx_audit_finding_standard'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('audit_findings', 'idx_audit_finding_vulnerability');
    await queryInterface.removeIndex('audit_findings', 'idx_audit_finding_compliance_gap');
    await queryInterface.removeIndex('audit_findings', 'idx_audit_finding_standard');
    
    await queryInterface.removeColumn('audit_findings', 'vulnerability_id');
    await queryInterface.removeColumn('audit_findings', 'compliance_gap_id');
    await queryInterface.removeColumn('audit_findings', 'standard_id');
  }
};