'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create reference data tables first
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      category_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('risk_levels', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      risk_level_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      risk_level_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('risk_ratings', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      risk_rating_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      risk_rating_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('system_vulnerabilities', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      vulnerability_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vulnerability_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      severity_level: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
        allowNull: false,
        defaultValue: 'Medium'
      },
      affected_systems: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('compliance_gaps', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      gap_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gap_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      regulatory_impact: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('bussiness_compliance_gaps', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      gap_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      gap_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      regulatory_impact: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('relevant_standards', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      standard_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      standard_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      issuing_body: {
        type: Sequelize.STRING,
        allowNull: true
      },
      version: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 2. Create branches table
    await queryInterface.createTable('branches', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      branch_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      branch_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. Create users table
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
        allowNull: true
      },
      branch_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM(
          'Admin',
          'Resident_Auditors',
          'Auditees',
          'Audit_Supervisor',
          'Auditee_Supervisor',
          'Auditee_Super_Supervisor',
          'Audit_Director',
          'Management',
          'IT_Auditors',
          'IT_Auditors_Supervisor',
          'IT_Auditors_Director',
          'IT_Auditees',
          'IT_Auditees_Supervisor',
          'IT_Auditees_Super_Supervisor',
          'Inspection_Auditors',
          'Inspection_Auditors_Supervisor',
          'Inspection_Auditors_Director',
          'Inspection_Auditees',
          'Inspection_Auditees_Supervisor',
          'Inspection_Auditees_Super_Supervisor'
        ),
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 4. Create audit_findings table
    await queryInterface.createTable('audit_findings', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false
      },
      criteria: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cause: {
        type: Sequelize.STRING,
        allowNull: false
      },
      impact: {
        type: Sequelize.STRING,
        allowNull: false
      },
      recommendation: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      risk_level_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      risk_rating_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved'),
        defaultValue: 'Pending'
      },
      rectification_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      reference_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },
      vulnerability_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      compliance_gap_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      business_compliance_gap_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      standard_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 5. Create audit_finding_rectifications table
    await queryInterface.createTable('audit_finding_rectifications', {
      rectification_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      submitted_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      rectification_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Approved', 'Rejected', 'Amended'),
        defaultValue: 'Pending',
        allowNull: false
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      approved_by_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 6. Create audit_finding_assigned table
    await queryInterface.createTable('audit_finding_assigned', {
      assigned_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      assigned_to_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      assigned_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 7. Create audit_finding_branch_assignments table
    await queryInterface.createTable('audit_finding_branch_assignments', {
      assignment_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      assigned_branch_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      branch_assigned_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      branch_assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 8. Create audit_finding_escalations table
    await queryInterface.createTable('audit_finding_escalations', {
      escalation_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      escalated_to_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      escalated_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      escalated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      escalation_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 9. Create action_plans table
    await queryInterface.createTable('action_plans', {
      action_plan_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      action_plan: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      timeline: {
        type: Sequelize.STRING,
        allowNull: true
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Overdue', 'In_Progress', 'Completed'),
        defaultValue: 'Pending',
        allowNull: false
      },
      submitted_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      progress_percentage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      progress_justification: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 10. Create evidences table
    await queryInterface.createTable('evidences', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 11. Create resources table
    await queryInterface.createTable('resources', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      resource_body: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resource_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 12. Create action_plan_responsible_persons table
    await queryInterface.createTable('action_plan_responsible_persons', {
      responsible_person_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      action_plan_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 13. Create action_plan_evidences table
    await queryInterface.createTable('action_plan_evidences', {
      evidence_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      action_plan_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 14. Create action_plan_resources table
    await queryInterface.createTable('action_plan_resources', {
      resource_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      action_plan_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      resource_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 15. Create audit_finding_evidences table
    await queryInterface.createTable('audit_finding_evidences', {
      evidence_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      uploaded_by_id: {
        type: Sequelize.UUID,
        allowNull: false
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
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 16. Create audit_rectification_evidences table
    await queryInterface.createTable('audit_rectification_evidences', {
      evidence_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      rectification_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      rectification_evidence_url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rectification_file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rectification_file_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 17. Create audit_amendment_histories table
    await queryInterface.createTable('audit_amendment_histories', {
      amendment_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      amend_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      criteria: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cause: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      impact: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      recommendation: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
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
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved'),
        allowNull: true,
        defaultValue: 'Pending'
      },
      rectification_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      amended_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 18. Create action_plan_amendment_histories table
    await queryInterface.createTable('action_plan_amendment_histories', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      action_plan_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      amend_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      action_plan: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      responsible_persons_id: {
        type: Sequelize.JSON,
        allowNull: true
      },
      timeline: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true
      },
      changes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      progress_percentage: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      progress_justification: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amended_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 19. Create audit_rectification_amendment_histories table
    await queryInterface.createTable('audit_rectification_amendment_histories', {
      amendment_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      rectification_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      amend_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      rectification: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('Pending', 'Submitted', 'Approved', 'Rejected', 'Amended'),
        allowNull: false,
        defaultValue: 'Pending'
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amended_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 20. Create escalation_rules table
    await queryInterface.createTable('escalation_rules', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
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
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 21. Create inspector_branch_assignments table
    await queryInterface.createTable('inspector_branch_assignments', {
      assignment_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      inspector_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      branch_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      assigned_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 22. Create token_blacklist table
    await queryInterface.createTable('token_blacklist', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 23. Create assigned_notifications table
    await queryInterface.createTable('assigned_notifications', {
      notification_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 24. Create escalation_notifications table
    await queryInterface.createTable('escalation_notifications', {
      notification_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      audit_finding_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      escalated_to_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      escalated_by_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      escalation_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add foreign key constraints
    await queryInterface.addConstraint('users', {
      fields: ['supervisor'],
      type: 'foreign key',
      name: 'users_supervisor_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('users', {
      fields: ['branch_id'],
      type: 'foreign key',
      name: 'users_branch_id_fkey',
      references: {
        table: 'branches',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['risk_level_id'],
      type: 'foreign key',
      name: 'audit_findings_risk_level_id_fkey',
      references: {
        table: 'risk_levels',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['category_id'],
      type: 'foreign key',
      name: 'audit_findings_category_id_fkey',
      references: {
        table: 'categories',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['risk_rating_id'],
      type: 'foreign key',
      name: 'audit_findings_risk_rating_id_fkey',
      references: {
        table: 'risk_ratings',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['created_by_id'],
      type: 'foreign key',
      name: 'audit_findings_created_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['rectification_id'],
      type: 'foreign key',
      name: 'audit_findings_rectification_id_fkey',
      references: {
        table: 'audit_finding_rectifications',
        field: 'rectification_id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['vulnerability_id'],
      type: 'foreign key',
      name: 'audit_findings_vulnerability_id_fkey',
      references: {
        table: 'system_vulnerabilities',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['compliance_gap_id'],
      type: 'foreign key',
      name: 'audit_findings_compliance_gap_id_fkey',
      references: {
        table: 'compliance_gaps',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['business_compliance_gap_id'],
      type: 'foreign key',
      name: 'audit_findings_business_compliance_gap_id_fkey',
      references: {
        table: 'bussiness_compliance_gaps',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_findings', {
      fields: ['standard_id'],
      type: 'foreign key',
      name: 'audit_findings_standard_id_fkey',
      references: {
        table: 'relevant_standards',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_rectifications', {
      fields: ['finding_id'],
      type: 'foreign key',
      name: 'audit_finding_rectifications_finding_id_fkey',
      references: {
        table: 'audit_findings',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_rectifications', {
      fields: ['submitted_by_id'],
      type: 'foreign key',
      name: 'audit_finding_rectifications_submitted_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_rectifications', {
      fields: ['approved_by_id'],
      type: 'foreign key',
      name: 'audit_finding_rectifications_approved_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_assigned', {
      fields: ['finding_id'],
      type: 'foreign key',
      name: 'audit_finding_assigned_finding_id_fkey',
      references: {
        table: 'audit_findings',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_assigned', {
      fields: ['assigned_to_id'],
      type: 'foreign key',
      name: 'audit_finding_assigned_assigned_to_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_assigned', {
      fields: ['assigned_by_id'],
      type: 'foreign key',
      name: 'audit_finding_assigned_assigned_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_branch_assignments', {
      fields: ['audit_finding_id'],
      type: 'foreign key',
      name: 'audit_finding_branch_assignments_audit_finding_id_fkey',
      references: {
        table: 'audit_findings',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_branch_assignments', {
      fields: ['assigned_branch_id'],
      type: 'foreign key',
      name: 'audit_finding_branch_assignments_assigned_branch_id_fkey',
      references: {
        table: 'branches',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_branch_assignments', {
      fields: ['branch_assigned_by_id'],
      type: 'foreign key',
      name: 'audit_finding_branch_assignments_branch_assigned_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_escalations', {
      fields: ['finding_id'],
      type: 'foreign key',
      name: 'audit_finding_escalations_finding_id_fkey',
      references: {
        table: 'audit_findings',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_escalations', {
      fields: ['escalated_to_id'],
      type: 'foreign key',
      name: 'audit_finding_escalations_escalated_to_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('audit_finding_escalations', {
      fields: ['escalated_by_id'],
      type: 'foreign key',
      name: 'audit_finding_escalations_escalated_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('action_plans', {
      fields: ['audit_finding_id'],
      type: 'foreign key',
      name: 'action_plans_audit_finding_id_fkey',
      references: {
        table: 'audit_findings',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('action_plans', {
      fields: ['submitted_by_id'],
      type: 'foreign key',
      name: 'action_plans_submitted_by_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

   // ... existing code up to previous response ...

    // Continue adding foreign key constraints for action_plan_responsible_persons
    await queryInterface.addConstraint('action_plan_responsible_persons', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'action_plan_responsible_persons_user_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Action Plan Evidence
      await queryInterface.addConstraint('action_plan_evidences', {
        fields: ['action_plan_id'],
        type: 'foreign key',
        name: 'action_plan_evidences_action_plan_id_fkey',
        references: {
          table: 'action_plans',
          field: 'action_plan_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Action Plan Resource
      await queryInterface.addConstraint('action_plan_resources', {
        fields: ['action_plan_id'],
        type: 'foreign key',
        name: 'action_plan_resources_action_plan_id_fkey',
        references: {
          table: 'action_plans',
          field: 'action_plan_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Audit Finding Evidence
      await queryInterface.addConstraint('audit_finding_evidences', {
        fields: ['audit_finding_id'],
        type: 'foreign key',
        name: 'audit_finding_evidences_audit_finding_id_fkey',
        references: {
          table: 'audit_findings',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('audit_finding_evidences', {
        fields: ['uploaded_by_id'],
        type: 'foreign key',
        name: 'audit_finding_evidences_uploaded_by_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
  
      // Audit Rectification Evidence
      await queryInterface.addConstraint('audit_rectification_evidences', {
        fields: ['rectification_id'],
        type: 'foreign key',
        name: 'audit_rectification_evidences_rectification_id_fkey',
        references: {
          table: 'audit_finding_rectifications',
          field: 'rectification_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Audit Amendment History
      await queryInterface.addConstraint('audit_amendment_histories', {
        fields: ['audit_finding_id'],
        type: 'foreign key',
        name: 'audit_amendment_histories_audit_finding_id_fkey',
        references: {
          table: 'audit_findings',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('audit_amendment_histories', {
        fields: ['amend_by_id'],
        type: 'foreign key',
        name: 'audit_amendment_histories_amend_by_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
  
      // Action Plan Amendment History
      await queryInterface.addConstraint('action_plan_amendment_histories', {
        fields: ['action_plan_id'],
        type: 'foreign key',
        name: 'action_plan_amendment_histories_action_plan_id_fkey',
        references: {
          table: 'action_plans',
          field: 'action_plan_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('action_plan_amendment_histories', {
        fields: ['amend_by_id'],
        type: 'foreign key',
        name: 'action_plan_amendment_histories_amend_by_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
  
      // Audit Rectification Amendment History
      await queryInterface.addConstraint('audit_rectification_amendment_histories', {
        fields: ['rectification_id'],
        type: 'foreign key',
        name: 'audit_rectification_amendment_histories_rectification_id_fkey',
        references: {
          table: 'audit_finding_rectifications',
          field: 'rectification_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('audit_rectification_amendment_histories', {
        fields: ['amend_by_id'],
        type: 'foreign key',
        name: 'audit_rectification_amendment_histories_amend_by_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
  
      // Inspector Branch Assignment
      await queryInterface.addConstraint('inspector_branch_assignments', {
        fields: ['inspector_id'],
        type: 'foreign key',
        name: 'inspector_branch_assignments_inspector_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('inspector_branch_assignments', {
        fields: ['branch_id'],
        type: 'foreign key',
        name: 'inspector_branch_assignments_branch_id_fkey',
        references: {
          table: 'branches',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('inspector_branch_assignments', {
        fields: ['assigned_by_id'],
        type: 'foreign key',
        name: 'inspector_branch_assignments_assigned_by_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Token Blacklist
      await queryInterface.addConstraint('token_blacklist', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'token_blacklist_user_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Assigned Notification
      await queryInterface.addConstraint('assigned_notifications', {
        fields: ['audit_finding_id'],
        type: 'foreign key',
        name: 'assigned_notifications_audit_finding_id_fkey',
        references: {
          table: 'audit_findings',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('assigned_notifications', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'assigned_notifications_user_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
  
      // Escalation Notification
      await queryInterface.addConstraint('escalation_notifications', {
        fields: ['audit_finding_id'],
        type: 'foreign key',
        name: 'escalation_notifications_audit_finding_id_fkey',
        references: {
          table: 'audit_findings',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('escalation_notifications', {
        fields: ['escalated_to_id'],
        type: 'foreign key',
        name: 'escalation_notifications_escalated_to_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
      await queryInterface.addConstraint('escalation_notifications', {
        fields: ['escalated_by_id'],
        type: 'foreign key',
        name: 'escalation_notifications_escalated_by_id_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    },
  
    down: async (queryInterface, Sequelize) => {
      // Drop tables in reverse order of creation to avoid constraint errors
      await queryInterface.dropTable('escalation_notifications');
      await queryInterface.dropTable('assigned_notifications');
      await queryInterface.dropTable('token_blacklist');
      await queryInterface.dropTable('inspector_branch_assignments');
      await queryInterface.dropTable('escalation_rules');
      await queryInterface.dropTable('audit_rectification_amendment_histories');
      await queryInterface.dropTable('action_plan_amendment_histories');
      await queryInterface.dropTable('audit_amendment_histories');
      await queryInterface.dropTable('audit_rectification_evidences');
      await queryInterface.dropTable('audit_finding_evidences');
      await queryInterface.dropTable('action_plan_resources');
      await queryInterface.dropTable('action_plan_evidences');
      await queryInterface.dropTable('action_plan_responsible_persons');
      await queryInterface.dropTable('resources');
      await queryInterface.dropTable('evidences');
      await queryInterface.dropTable('action_plans');
      await queryInterface.dropTable('audit_finding_escalations');
      await queryInterface.dropTable('audit_finding_branch_assignments');
      await queryInterface.dropTable('audit_finding_assigned');
      await queryInterface.dropTable('audit_finding_rectifications');
      await queryInterface.dropTable('audit_findings');
      await queryInterface.dropTable('users');
      await queryInterface.dropTable('branches');
      await queryInterface.dropTable('relevant_standards');
      await queryInterface.dropTable('bussiness_compliance_gaps');
      await queryInterface.dropTable('compliance_gaps');
      await queryInterface.dropTable('system_vulnerabilities');
      await queryInterface.dropTable('risk_ratings');
      await queryInterface.dropTable('risk_levels');
      await queryInterface.dropTable('categories');
    }
  };
