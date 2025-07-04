// const { v4: uuidv4 } = require('uuid');

// module.exports = (sequelize, DataTypes) => {
//   const ActionPlanAmendmentHistory = sequelize.define('ActionPlanAmendmentHistory', {
//     id: {
//       type: DataTypes.UUID,
//       primaryKey: true,
//       defaultValue: () => uuidv4()
//     },
//     amend_by_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//     action_plan_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//     action_plan: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     responsible_persons_id: {
//       type: DataTypes.JSON, // Storing as JSON for ARRAY(UUID) in MySQL
//       allowNull: true,
//     },
//     timeline: {
//       type: DataTypes.DATE,
//       allowNull: true,
//     },
//     resourse_id: {
//       type: DataTypes.JSON, // Storing as JSON for ARRAY(UUID) in MySQL
//       allowNull: true,
//     },
//     evidence_id: {
//       type: DataTypes.JSON, // Storing as JSON for ARRAY(UUID) in MySQL
//       allowNull: true,
//     },
//     status: {
//       type: DataTypes.ENUM('Pending', 'In_Progress', 'Overdue', 'Completed'),
//       allowNull: true,
//     },
//   }, {
//     tableName: 'action_plan_amendment_histories',
//     timestamps: true,
//     indexes: [
//       {
//         fields: ['amend_by_id'],
//         name: 'idx_action_plan_amendment_amend_by'
//       },
//       {
//         fields: ['action_plan_id'],
//         name: 'idx_action_plan_amendment_action_plan'
//       }
//     ]
//   });

//   ActionPlanAmendmentHistory.associate = (models) => {
//     ActionPlanAmendmentHistory.belongsTo(models.User, { foreignKey: 'amend_by_id' });
//     ActionPlanAmendmentHistory.belongsTo(models.ActionPlan, { foreignKey: 'action_plan_id' });
//   };

//   return ActionPlanAmendmentHistory;
// };








'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlanAmendmentHistory extends Model {
    static associate(models) {
      ActionPlanAmendmentHistory.belongsTo(models.User, {
        foreignKey: 'amend_by_id',
        as: 'amendedBy'
      });
      ActionPlanAmendmentHistory.belongsTo(models.ActionPlan, {
        foreignKey: 'action_plan_id',
        as: 'actionPlan'
      });
    }
  }

  ActionPlanAmendmentHistory.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    amend_by_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'action_plans',
        key: 'id'
      }
    },
    action_plan: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'The action plan text/description'
    },
    responsible_persons_id: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of user IDs responsible for this action plan'
    },
    timeline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Due date for the action plan'
    },
    resource_id: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of resource IDs assigned to this action plan'
    },
    evidence_id: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of evidence file names/IDs'
    },
    status: {
      type: DataTypes.ENUM('Pending', 'In_Progress', 'Overdue', 'Completed'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    amended_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When this amendment was made'
    }
  }, {
    sequelize,
    modelName: 'ActionPlanAmendmentHistory',
    tableName: 'action_plan_amendment_histories',
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ['amend_by_id'],
        name: 'idx_action_plan_amendment_amend_by'
      },
      {
        fields: ['action_plan_id'],
        name: 'idx_action_plan_amendment_action_plan'
      }
    ]
  });

  return ActionPlanAmendmentHistory;
};