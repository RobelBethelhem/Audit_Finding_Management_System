const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    type:{
      type: DataTypes.ENUM('Business', 'Inspection', 'IT_Audit'),
      defaultValue: 'Business'
    },
    supervisor:{
      type: DataTypes.UUID,
      allowNull: true,
    },
    role:{
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Inactive'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        fields: ['username'],
        name: 'idx_user_username'
      },
      {
        fields: ['email'],
        name: 'idx_user_email'
      }
    ]
  });

  User.associate = (models) => {
    User.belongsTo(models.User, { as: 'mySupervisor', foreignKey: 'supervisor' });
    User.hasMany(models.User, { as: 'mySupervisees', foreignKey: 'supervisor' });
    User.hasMany(models.AuditFinding, { as: 'createdAuditFindings', foreignKey: 'created_by_id' });
    User.hasMany(models.AuditFindingAssigned, { as: 'assignedFindings', foreignKey: 'assigned_to_id' });
    User.hasMany(models.AuditFindingEscalation, { as: 'escalatedFindings', foreignKey: 'escalated_to_id' });
    User.hasMany(models.AuditFindingEscalation, { as: 'escalatedByMe', foreignKey: 'escalated_by_id' });
    User.hasMany(models.AuditFindingRectification, { as: 'submittedRectifications', foreignKey: 'submitted_by_id' });
    User.hasMany(models.AuditFindingRectification, { as: 'approvedRectifications', foreignKey: 'approved_by_id' });
    User.hasMany(models.AuditAmendmentHistory, { as: 'amendmentHistories', foreignKey: 'amend_by_id' });
    User.hasMany(models.AuditRectificationAmendmentHistory, { as: 'rectificationAmendmentHistories', foreignKey: 'amend_by_id' });
    User.hasMany(models.ActionPlan, { as: 'submittedActionPlans', foreignKey: 'submitted_by_id' });
    User.hasMany(models.ActionPlanResponsiblePerson, { foreignKey: 'user_id' });
    User.hasMany(models.ActionPlanAmendmentHistory, { as: 'actionPlanAmendmentHistories', foreignKey: 'amend_by_id' });
    User.hasMany(models.AssignedNotification, { foreignKey: 'user_id' });
    User.hasMany(models.EscalationNotification, { foreignKey: 'user_id' });
  };

  return User;
}; 