const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ActionPlanEvidence = sequelize.define('ActionPlanEvidence', {
    evidence_id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'action_plan_evidences',
    timestamps: true,
  });

  ActionPlanEvidence.associate = (models) => {
    ActionPlanEvidence.belongsTo(models.ActionPlan, { foreignKey: 'action_plan_id' });
  };

  return ActionPlanEvidence;
}; 