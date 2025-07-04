const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ActionPlanResource = sequelize.define('ActionPlanResource', {
    resource_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    resource_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  }, {
    tableName: 'action_plan_resources',
    timestamps: true,
  });

  ActionPlanResource.associate = (models) => {
    ActionPlanResource.belongsTo(models.ActionPlan, { foreignKey: 'action_plan_id' });
  };

  return ActionPlanResource;
}; 