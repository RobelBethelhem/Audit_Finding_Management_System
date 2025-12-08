// const { v4: uuidv4 } = require('uuid');

// module.exports = (sequelize, DataTypes) => {
//   const User = sequelize.define('User', {
//     id: {
//       type: DataTypes.UUID,
//       primaryKey: true,
//       defaultValue: () => uuidv4()
//     },
//     username: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true
//     },
//     password: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },
//     department: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },
//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true
//     },
//     type:{
//       type: DataTypes.ENUM('Business', 'Inspection', 'IT_Audit'),
//       defaultValue: 'Business'
//     },
//     supervisor:{
//       type: DataTypes.UUID,
//       allowNull: true,
//     },
//     branch_id: {
//       type: DataTypes.UUID,
//       allowNull: true,
//       references: {
//         model: 'branches',
//         key: 'id'
//       }
//     },
//     role:{
//       type: DataTypes.ENUM(
//         'Admin', 
        
//         //Business Roles
//         'Resident_Auditors', 
//         'Auditees', 
//         'Audit_Supervisor', 
//         'Auditee_Supervisor', 
//         'Auditee_Super_Supervisor',
//         'Audit_Director', 

//         //IT Audit Roles
//         'Management',
//         'IT_Auditors',
//         'IT_Auditors_Supervisor',
//         'IT_Auditors_Director',
//         'IT_Auditees',
//         'IT_Auditees_Supervisor',
//         'IT_Auditees_Super_Supervisor',

//         //Inspection Roles
//         'Inspection_Auditors',
//         'Inspection_Auditors_Supervisor',
//         'Inspection_Auditors_Director',
//         'Inspection_Auditees',
//         'Inspection_Auditees_Supervisor',
//         'Inspection_Auditees_Super_Supervisor'
//       ),
//       defaultValue: 'Auditees'
//     },
    
//     is_active: {
//       type: DataTypes.ENUM('Active', 'Inactive'),
//       defaultValue: 'Inactive'
//     },
//     last_login: {
//       type: DataTypes.DATE,
//       allowNull: true
//     }
    
//   }, {
//     underscored: true, // This tells Sequelize to use snake_case column names
//     tableName: 'users',
//     underscored: true,
//   });

//   User.associate = (models) => {
//     User.belongsTo(models.User, { as: 'mySupervisor', foreignKey: 'supervisor' });
//     User.hasMany(models.User, { as: 'mySupervisees', foreignKey: 'supervisor' });
//     User.belongsTo(models.Branch, { as: 'branch', foreignKey: 'branch_id' });
//     User.hasMany(models.AuditFinding, { as: 'createdAuditFindings', foreignKey: 'created_by_id' });
//     User.hasMany(models.AuditFindingAssigned, { as: 'assignedFindings', foreignKey: 'assigned_to_id' });
//     User.hasMany(models.AuditFindingEscalation, { as: 'escalatedFindings', foreignKey: 'escalated_to_id' });
//     User.hasMany(models.AuditFindingEscalation, { as: 'escalatedByMe', foreignKey: 'escalated_by_id' });
//     User.hasMany(models.AuditFindingRectification, { as: 'submittedRectifications', foreignKey: 'submitted_by_id' });
//     User.hasMany(models.AuditFindingRectification, { as: 'approvedRectifications', foreignKey: 'approved_by_id' });
//     User.hasMany(models.AuditAmendmentHistory, { as: 'amendmentHistories', foreignKey: 'amend_by_id' });
//     User.hasMany(models.AuditRectificationAmendmentHistory, { as: 'rectificationAmendmentHistories', foreignKey: 'amend_by_id' });
//     User.hasMany(models.ActionPlan, { as: 'submittedActionPlans', foreignKey: 'submitted_by_id' });
//     User.hasMany(models.ActionPlanResponsiblePerson, { foreignKey: 'user_id' });
//     User.hasMany(models.ActionPlanAmendmentHistory, { as: 'actionPlanAmendmentHistories', foreignKey: 'amend_by_id' });
//     User.hasMany(models.AssignedNotification, { foreignKey: 'user_id' });
//     User.hasMany(models.EscalationNotification, { foreignKey: 'user_id' });
//   };

//   return User;
// }; 

// models/User.js - Updated associate function
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
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    role:{
      type: DataTypes.ENUM(
        'Admin', 
        
        //Business Roles
        'Resident_Auditors', 
        'Auditees', 
        'Audit_Supervisor', 
        'Auditee_Supervisor', 
        'Auditee_Super_Supervisor',
        'Audit_Director', 

        //IT Audit Roles
        'Management',
        'IT_Auditors',
        'IT_Auditors_Supervisor',
        'IT_Auditors_Director',
        'IT_Auditees',
        'IT_Auditees_Supervisor',
        'IT_Auditees_Super_Supervisor',

        //Inspection Roles
        'Inspection_Auditors',
        'Inspection_Auditors_Supervisor',
        'Inspection_Auditors_Director',
        'Inspection_Auditees',
        'Inspection_Auditees_Supervisor',
        'Inspection_Auditees_Super_Supervisor'
      ),
      defaultValue: 'Auditees'
    },
    
    // is_active: {
    //   type: DataTypes.ENUM('Active', 'Inactive'),
    //   defaultValue: 'Inactive'
    // },


    is_active: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Inactive',
      // Add getter to return boolean when reading
      get() {
        const value = this.getDataValue('is_active');
        return value === 'Active';
      },
      // Add setter to convert boolean to ENUM when writing
      set(value) {
        if (typeof value === 'boolean') {
          this.setDataValue('is_active', value ? 'Active' : 'Inactive');
        } else if (typeof value === 'string') {
          // Handle string boolean values
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true' || lowerValue === '1') {
            this.setDataValue('is_active', 'Active');
          } else if (lowerValue === 'false' || lowerValue === '0') {
            this.setDataValue('is_active', 'Inactive');
          } else {
            // Allow 'Active' and 'Inactive' to pass through
            this.setDataValue('is_active', value);
          }
        } else if (typeof value === 'number') {
          this.setDataValue('is_active', value ? 'Active' : 'Inactive');
        } else {
          this.setDataValue('is_active', value);
        }
      }
    },

    
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    underscored: true,
    tableName: 'users',
  });

  User.associate = (models) => {
    // Existing associations
    User.belongsTo(models.User, { as: 'mySupervisor', foreignKey: 'supervisor' });
    User.hasMany(models.User, { as: 'mySupervisees', foreignKey: 'supervisor' });
    User.belongsTo(models.Branch, { as: 'branch', foreignKey: 'branch_id' });
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
    
    // New associations for authentication
    User.hasOne(models.ActiveSession, { 
      foreignKey: 'user_id', 
      as: 'activeSession',
      onDelete: 'CASCADE'
    });
    
    User.hasMany(models.TokenBlacklist, { 
      foreignKey: 'user_id', 
      as: 'blacklistedTokens',
      onDelete: 'CASCADE'
    });










      // chat User can participate in many conversations

  User.hasMany(models.ConversationParticipant,{
    foreignKey: 'user_id',
    as: 'converationParticipants',
  })

  User.belongsToMany(models.Conversation, {
    through: models.ConversationParticipant,
    as: 'conversations',
    foreignKey: 'user_id',
    otherKey: 'conversation_id'
  });

  // chat: User can create many conversations
  User.hasMany(models.Conversation, {
    foreignKey: 'created_by',
    as: 'createdConversations'
  });

  // chat: user can send many messages
  User.hasMany(models.Message, {
    foreignKey: 'sender_id',
    as: 'sentMessages'
  });

  // chat: user can have many message read statuses
  User.hasMany(models.MessageReadStatus, {
    foreignKey: 'user_id',
    as: 'messageReadStatuses'
  });

  // chat: user can add many reactions
  User.hasMany(models.MessageReaction, {
    foreignKey: 'user_id',
    as: 'messageReactions'
  });


  };

  // chat: user has many conversations through ConversationParticipant
  


  return User;
};
