const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define('Resource', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_size: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    resource_body: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resource_type: {
      type: DataTypes.ENUM('Resource', 'Evidence'),
      defaultValue: 'Resource'
    }

  }, {
    tableName: 'resources',
    timestamps: true,
    indexes: [
      {
        fields: ['file_path'],
        name: 'idx_resource_file_path'
      }
    ]
  });

  return Resource;
}; 