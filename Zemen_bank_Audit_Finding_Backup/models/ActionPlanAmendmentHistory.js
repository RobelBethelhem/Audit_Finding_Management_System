// models/ActionPlanAmendmentHistory.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlanAmendmentHistory extends Model {
    static associate(models) {
      if (models.User) {
        ActionPlanAmendmentHistory.belongsTo(models.User, {
          foreignKey: 'amend_by_id',
          as: 'amendedBy'
        });
      }
      
      if (models.ActionPlan) {
        ActionPlanAmendmentHistory.belongsTo(models.ActionPlan, {
          foreignKey: 'action_plan_id'
        });
      }
    }
  }

  ActionPlanAmendmentHistory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amend_by_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    action_plan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responsible_persons_id: {
      type: DataTypes.JSON,
      allowNull: true
    },
    timeline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    progress_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    progress_justification: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amended_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ActionPlanAmendmentHistory',
    tableName: 'action_plan_amendment_histories',
    underscored: true,
    timestamps: false
  });

  return ActionPlanAmendmentHistory;
};















