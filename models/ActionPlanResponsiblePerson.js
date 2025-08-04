// const { v4: uuidv4 } = require('uuid');

// module.exports = (sequelize, DataTypes) => {
//   const ActionPlanResponsiblePerson = sequelize.define('ActionPlanResponsiblePerson', {
//     responsible_person_id: {
//       type: DataTypes.UUID,
//       defaultValue: () => uuidv4(),
//       primaryKey: true,
//     },
//     action_plan_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//     user_id: {
//       type: DataTypes.UUID,
//       allowNull: false,
//     },
//   }, {
//     tableName: 'action_plan_responsible_persons',
//     timestamps: true,
//   });

//   ActionPlanResponsiblePerson.associate = (models) => {
//     ActionPlanResponsiblePerson.belongsTo(models.ActionPlan, { foreignKey: 'action_plan_id' });
//     ActionPlanResponsiblePerson.belongsTo(models.User, { foreignKey: 'user_id' });
//   };

//   return ActionPlanResponsiblePerson;
// }; 


'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlanResponsiblePerson extends Model {
    static associate(models) {
      ActionPlanResponsiblePerson.belongsTo(models.ActionPlan, {
        foreignKey: 'action_plan_id',
        as: 'actionPlan'
      });
      ActionPlanResponsiblePerson.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  ActionPlanResponsiblePerson.init({
    responsible_person_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'action_plans',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'ActionPlanResponsiblePerson',
    tableName: 'action_plan_responsible_persons',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['action_plan_id'],
        name: 'idx_action_plan_responsible_action_plan'
      },
      {
        fields: ['user_id'],
        name: 'idx_action_plan_responsible_user'
      },
      {
        fields: ['action_plan_id', 'user_id'],
        unique: true,
        name: 'idx_action_plan_user_unique'
      }
    ]
  });

    ActionPlanResponsiblePerson.associate = (models) => {
    ActionPlanResponsiblePerson.belongsTo(models.ActionPlan, { foreignKey: 'action_plan_id' });
    ActionPlanResponsiblePerson.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return ActionPlanResponsiblePerson;
};