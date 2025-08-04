const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Resource extends Model {
    static associate(models) {
      Resource.hasMany(models.ActionPlan, {
        foreignKey: 'primary_resource_id',
        as: 'actionPlans'
      });
      Resource.hasMany(models.ActionPlanResource, {
        foreignKey: 'resource_id',
        as: 'actionPlanResources'
      });
    }
  }

  Resource.init({
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
      allowNull: true
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    resource_body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resource_type: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Resource',
    tableName: 'resources',
    underscored: true,
    timestamps: true
  });

  return Resource;
}; 
