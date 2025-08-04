'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create audit_finding_evidences table
    await queryInterface.createTable('audit_finding_evidences', {
      evidence_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'audit_findings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      uploaded_by_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      original_file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_path: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('audit_finding_evidences', ['audit_finding_id']);
    await queryInterface.addIndex('audit_finding_evidences', ['uploaded_by_id']);
    await queryInterface.addIndex('audit_finding_evidences', ['is_active']);
    await queryInterface.addIndex('audit_finding_evidences', ['created_at']);

    // Remove the old supporting_documentation column from audit_findings table
    await queryInterface.removeColumn('audit_findings', 'supporting_documentation');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the supporting_documentation column
    await queryInterface.addColumn('audit_findings', 'supporting_documentation', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Drop the audit_finding_evidences table
    await queryInterface.dropTable('audit_finding_evidences');
  }
};
