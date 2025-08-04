'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add due_date column to audit_findings table
      await queryInterface.addColumn('audit_findings', 'due_date', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Due date for resolving the audit finding'
      });

      // Add supporting_documentation column to audit_findings table
      await queryInterface.addColumn('audit_findings', 'supporting_documentation', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Supporting documentation details, references, or file descriptions'
      });

      console.log('Successfully added due_date and supporting_documentation columns to audit_findings table');
    } catch (error) {
      console.error('Error adding columns to audit_findings table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove supporting_documentation column
      await queryInterface.removeColumn('audit_findings', 'supporting_documentation');
      
      // Remove due_date column
      await queryInterface.removeColumn('audit_findings', 'due_date');

      console.log('Successfully removed due_date and supporting_documentation columns from audit_findings table');
    } catch (error) {
      console.error('Error removing columns from audit_findings table:', error);
      throw error;
    }
  }
};
