// models/Evidence.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Evidence extends Model {
    static associate(models) {
      Evidence.hasMany(models.ActionPlan, {
        foreignKey: 'primary_evidence_id',
        as: 'actionPlans'
      });
      Evidence.hasMany(models.ActionPlanEvidence, {
        foreignKey: 'evidence_id',
        as: 'actionPlanEvidences'
      });
    }
  }

  Evidence.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Evidence',
    tableName: 'evidences',
    underscored: true,
    timestamps: true
  });

  return Evidence;
};