'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Wrap all operations in a transaction to ensure atomicity
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Base tables with no external foreign keys (or only self-referencing)
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4
        },
        username: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false
        },
        department: {
          type: Sequelize.STRING,
          allowNull: true
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        type: {
          type: Sequelize.ENUM('Business', 'Inspection', 'IT_Audit'),
          defaultValue: 'Business'
        },
        supervisor: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        role: {
          type: Sequelize.ENUM('Admin', 'Resident_Auditors', 'Auditees', 'Audit_Supervisor', 'Auditee_Supervisor', 'Auditee_Super_Supervisor', 'Audit_Director', 'Management', 'IT_Auditors', 'IT_Auditors_Supervisor', 'IT_Auditors_Director', 'IT_Auditees', 'IT_Auditees_Supervisor', 'IT_Auditees_Super_Supervisor', 'Inspection_Auditors', 'Inspection_Auditors_Supervisor', 'Inspection_Auditors_Director', 'Inspection_Auditees', 'Inspection_Auditees_Supervisor', 'Inspection_Auditees_Super_Supervisor'),
          defaultValue: 'Auditees'
        },
        is_active: {
          type: Sequelize.ENUM('Active', 'Inactive'),
          defaultValue: 'Inactive'
        },
        last_login: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('categories', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        category_name: { type: Sequelize.STRING, allowNull: false },
        category_description: { type: Sequelize.STRING, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('risk_levels', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        risk_level_name: { type: Sequelize.STRING, allowNull: false },
        risk_level_description: { type: Sequelize.STRING, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('risk_ratings', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        risk_rating_name: { type: Sequelize.STRING, allowNull: false },
        risk_rating_description: { type: Sequelize.STRING, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('resources', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        file_path: { type: Sequelize.STRING, allowNull: true },
        file_type: { type: Sequelize.STRING, allowNull: true },
        file_size: { type: Sequelize.FLOAT, allowNull: true },
        resource_body: { type: Sequelize.STRING, allowNull: true },
        resource_type: { type: Sequelize.ENUM('Resource', 'Evidence'), defaultValue: 'Resource' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      // 2. Tables with dependencies on the base tables
      await queryInterface.createTable('token_blacklist', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        token: { type: Sequelize.TEXT, allowNull: false, unique: true },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      // 3. Handle circular dependency: create `audit_findings` without the FK, then create the referenced table, then add the FK column.
      await queryInterface.createTable('audit_findings', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        title: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        criteria: { type: Sequelize.TEXT, allowNull: false },
        cause: { type: Sequelize.TEXT, allowNull: false },
        impact: { type: Sequelize.TEXT, allowNull: false },
        recommendation: { type: Sequelize.TEXT, allowNull: false },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        risk_level_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'risk_levels', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        category_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        risk_rating_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'risk_ratings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        created_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        status: { type: Sequelize.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved'), defaultValue: 'Pending' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
        // The `rectification_id` column is intentionally omitted here and will be added later.
      }, { transaction });

      await queryInterface.createTable('audit_finding_rectifications', {
        rectification_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        submitted_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        rectification_text: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.ENUM('Pending', 'Approved', 'Rejected', 'Amended'), defaultValue: 'Pending', allowNull: false },
        approved_by_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      // Add the `rectification_id` column to `audit_findings` to complete the circular reference.
      await queryInterface.addColumn('audit_findings', 'rectification_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'audit_finding_rectifications', key: 'rectification_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // 4. Tables that depend on `audit_findings` and other base tables.
      await queryInterface.createTable('action_plans', {
        action_plan_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        audit_finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        action_plan: { type: Sequelize.TEXT, allowNull: false },
        timeline: { type: Sequelize.DATE, allowNull: false },
        status: { type: Sequelize.ENUM('Pending', 'In_Progress', 'Completed', 'Overdue'), defaultValue: 'Pending', allowNull: false },
        submitted_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('assigned_notifications', {
        notification_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        audit_finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        message: { type: Sequelize.TEXT, allowNull: false },
        read: { type: Sequelize.BOOLEAN, defaultValue: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      
      await queryInterface.createTable('audit_finding_assigned', {
        assigned_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        assigned_to_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      await queryInterface.addConstraint('audit_finding_assigned', { fields: ['finding_id', 'assigned_to_id'], type: 'unique', name: 'idx_audit_finding_assigned_unique', transaction });

      await queryInterface.createTable('audit_finding_escalations', {
        escalation_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        escalated_to_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        escalated_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        escalated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        escalation_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      
      await queryInterface.createTable('escalation_notifications', {
        notification_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        audit_finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        escalated_to_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        escalated_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        message: { type: Sequelize.TEXT, allowNull: false },
        read: { type: Sequelize.BOOLEAN, defaultValue: false },
        escalation_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      // 5. History and Evidence tables (deepest dependencies)
      await queryInterface.createTable('audit_rectification_evidences', {
        evidence_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        rectification_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_finding_rectifications', key: 'rectification_id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        rectification_evidence_url: { type: Sequelize.STRING, allowNull: false },
        rectification_file_name: { type: Sequelize.STRING, allowNull: false },
        rectification_file_type: { type: Sequelize.STRING, allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('audit_rectification_amendment_histories', {
        amendment_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        rectification_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_finding_rectifications', key: 'rectification_id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        amend_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        rectification: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM('Pending', 'Submitted', 'Approved', 'Rejected', 'Amended'), allowNull: false, defaultValue: 'Pending' },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        amended_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      }, { transaction });

      await queryInterface.createTable('audit_amendment_histories', {
        amendment_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        audit_finding_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'audit_findings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        amend_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        title: { type: Sequelize.STRING, allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        criteria: { type: Sequelize.TEXT, allowNull: true },
        cause: { type: Sequelize.TEXT, allowNull: true },
        impact: { type: Sequelize.TEXT, allowNull: true },
        recommendation: { type: Sequelize.TEXT, allowNull: true },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        risk_level_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'risk_levels', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        category_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        risk_rating_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'risk_ratings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        created_by_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        status: { type: Sequelize.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved'), allowNull: true, defaultValue: 'Pending' },
        rectification_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'audit_finding_rectifications', key: 'rectification_id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        amended_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      }, { transaction });
      
      await queryInterface.createTable('action_plan_evidences', {
        evidence_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        action_plan_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'action_plans', key: 'action_plan_id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        file_path: { type: Sequelize.STRING, allowNull: false },
        file_name: { type: Sequelize.STRING, allowNull: false },
        file_type: { type: Sequelize.STRING, allowNull: false },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('action_plan_resources', {
        resource_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        action_plan_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'action_plans', key: 'action_plan_id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        resource_name: { type: Sequelize.STRING, allowNull: false },
        quantity: { type: Sequelize.INTEGER, allowNull: true },
        cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });

      await queryInterface.createTable('action_plan_responsible_persons', {
        responsible_person_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        action_plan_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'action_plans', key: 'action_plan_id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        created_at: { allowNull: false, type: Sequelize.DATE },
        updated_at: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      await queryInterface.addConstraint('action_plan_responsible_persons', { fields: ['action_plan_id', 'user_id'], type: 'unique', name: 'idx_action_plan_user_unique', transaction });

      await queryInterface.createTable('action_plan_amendment_histories', {
        id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        amend_by_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        action_plan_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'action_plans', key: 'action_plan_id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        action_plan: { type: Sequelize.TEXT, allowNull: true },
        responsible_persons_id: { type: Sequelize.JSON, allowNull: true },
        timeline: { type: Sequelize.DATE, allowNull: true },
        resource_id: { type: Sequelize.JSON, allowNull: true },
        evidence_id: { type: Sequelize.JSON, allowNull: true },
        status: { type: Sequelize.ENUM('Pending', 'In_Progress', 'Overdue', 'Completed'), allowNull: false, defaultValue: 'Pending' },
        amended_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop tables in the reverse order of creation to respect foreign key constraints.
      await queryInterface.dropTable('action_plan_amendment_histories', { transaction });
      await queryInterface.dropTable('action_plan_responsible_persons', { transaction });
      await queryInterface.dropTable('action_plan_resources', { transaction });
      await queryInterface.dropTable('action_plan_evidences', { transaction });
      await queryInterface.dropTable('audit_amendment_histories', { transaction });
      await queryInterface.dropTable('audit_rectification_amendment_histories', { transaction });
      await queryInterface.dropTable('audit_rectification_evidences', { transaction });
      await queryInterface.dropTable('escalation_notifications', { transaction });
      await queryInterface.dropTable('audit_finding_escalations', { transaction });
      await queryInterface.dropTable('audit_finding_assigned', { transaction });
      await queryInterface.dropTable('assigned_notifications', { transaction });
      await queryInterface.dropTable('action_plans', { transaction });
      
      // To break the circular dependency, we must first remove the added FK column before dropping the tables.
      await queryInterface.removeColumn('audit_findings', 'rectification_id', { transaction });
      await queryInterface.dropTable('audit_finding_rectifications', { transaction });
      await queryInterface.dropTable('audit_findings', { transaction });
      
      await queryInterface.dropTable('token_blacklist', { transaction });
      await queryInterface.dropTable('resources', { transaction });
      await queryInterface.dropTable('risk_ratings', { transaction });
      await queryInterface.dropTable('risk_levels', { transaction });
      await queryInterface.dropTable('categories', { transaction });
      await queryInterface.dropTable('users', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};