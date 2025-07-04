const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category_description: {
      type: DataTypes.STRING,
      allowNull: true,
    },

  }, {
    tableName: 'categories',
    timestamps: true,
    indexes: [
      {
        fields: ['category_name'],
        name: 'idx_category_name'
      }
    ]
  });

  Category.associate = (models) => {
    Category.hasMany(models.AuditFinding, { foreignKey: 'category_id' });
  };

  return Category;
}; 