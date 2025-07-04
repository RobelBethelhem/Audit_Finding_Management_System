const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const RiskLevel = sequelize.define('RiskLevel', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    risk_level_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    risk_level_description: {
      type: DataTypes.STRING,
      allowNull: true,
    },

  }, {
    tableName: 'risk_levels',
    timestamps: true,
    indexes: [
      {
        fields: ['risk_level_name'],
        name: 'idx_risk_level_name'
      }
    ]
  });

  RiskLevel.associate = (models) => {
    RiskLevel.hasMany(models.AuditFinding, { foreignKey: 'risk_level_id' });
  };

  return RiskLevel;
}; 