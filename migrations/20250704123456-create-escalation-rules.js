'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('escalation_rules', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('(UUID())'), // Or Sequelize.UUIDV4 if supported
        allowNull: false
      },
      department: {
        type: Sequelize.ENUM('Business', 'IT_Audit', 'Inspection'),
        allowNull: false
      },
      risk_level_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      risk_rating_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      vulnerability_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      compliance_gap_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      standard_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      escalation_level: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      days_threshold: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      escalate_to_role: {
        type: Sequelize.STRING,
        allowNull: false
      },
      send_reminder_days_before: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('escalation_rules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_escalation_rules_department;');
  }
};
