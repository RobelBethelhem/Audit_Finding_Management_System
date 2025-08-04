const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlanEvidence extends Model {
    static associate(models) {
      if (models.ActionPlan) {
        ActionPlanEvidence.belongsTo(models.ActionPlan, {
          foreignKey: 'action_plan_id',
          as: 'actionPlan'
        });
      }
    }
  }

  ActionPlanEvidence.init({
    evidence_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action_plan_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ActionPlanEvidence',
    tableName: 'action_plan_evidences',
    underscored: true,
    timestamps: true
  });

  return ActionPlanEvidence;
}; 
