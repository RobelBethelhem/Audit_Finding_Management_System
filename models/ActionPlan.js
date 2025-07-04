// const { v4: uuidv4 } = require('uuid');

// module.exports = (sequelize, DataTypes) => {
//   const ActionPlan = sequelize.define('ActionPlan', {
//     action_plan_id: {
//       type: DataTypes.UUID,
//       defaultValue: () => uuidv4(),
//       primaryKey: true,
//     },
//     audit_finding_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//     action_plan: {
//       type: DataTypes.TEXT,
//       allowNull: false,
//     },
//     timeline: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//     status: {
//       type: DataTypes.ENUM('Pending', 'In_Progress', 'Completed', 'Overdue'),
//       defaultValue: 'Pending',
//       allowNull: false,
//     },
//     submitted_by_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//   }, {
//     tableName: 'action_plans',
//     timestamps: true,
//   });

//   ActionPlan.associate = (models) => {
//     ActionPlan.belongsTo(models.AuditFinding, { foreignKey: 'audit_finding_id' });
//     ActionPlan.belongsTo(models.User, { as: 'submittedBy', foreignKey: 'submitted_by_id' });
//     ActionPlan.hasMany(models.ActionPlanResponsiblePerson, { foreignKey: 'action_plan_id' });
//     ActionPlan.hasMany(models.ActionPlanResource, { foreignKey: 'action_plan_id' });
//     ActionPlan.hasMany(models.ActionPlanEvidence, { foreignKey: 'action_plan_id' });
//     ActionPlan.hasMany(models.ActionPlanAmendmentHistory, { foreignKey: 'action_plan_id' });
//   };

//   return ActionPlan;
// }; 

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlan extends Model {
    static associate(models) {
      ActionPlan.belongsTo(models.AuditFinding, {
        foreignKey: 'audit_finding_id',
        as: 'auditFinding'
      });
      ActionPlan.belongsTo(models.User, {
        foreignKey: 'submitted_by_id',
        as: 'submittedBy'
      });
      ActionPlan.hasMany(models.ActionPlanResponsiblePerson, {
        foreignKey: 'action_plan_id',
        as: 'responsiblePersons'
      });
      ActionPlan.hasMany(models.ActionPlanResource, {
        foreignKey: 'action_plan_id',
        as: 'resources'
      });
      ActionPlan.hasMany(models.ActionPlanEvidence, {
        foreignKey: 'action_plan_id',
        as: 'evidences'
      });
      ActionPlan.hasMany(models.ActionPlanAmendmentHistory, {
        foreignKey: 'action_plan_id',
        as: 'amendmentHistory'
      });
    }
  }

  ActionPlan.init({
    action_plan_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    audit_finding_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'audit_findings',
        key: 'id'
      }
    },
    action_plan: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    timeline: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'In_Progress', 'Completed', 'Overdue'),
      defaultValue: 'Pending',
      allowNull: false
    },
    submitted_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'ActionPlan',
    tableName: 'action_plans',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['audit_finding_id']
      },
      {
        fields: ['submitted_by_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['timeline']
      }
    ]
  });

  return ActionPlan;
};