const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlanResource extends Model {
    static associate(models) {
      if (models.ActionPlan) {
        ActionPlanResource.belongsTo(models.ActionPlan, {
          foreignKey: 'action_plan_id',
          as: 'actionPlan'
        });
      }
    }
  }

  ActionPlanResource.init({
    resource_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    resource_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ActionPlanResource',
    tableName: 'action_plan_resources',
    underscored: true,
    timestamps: true
  });

  return ActionPlanResource;
}; 
