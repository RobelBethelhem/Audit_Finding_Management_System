const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const RiskRating = sequelize.define('RiskRating', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    risk_rating_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    risk_rating_description: {
      type: DataTypes.STRING,
      allowNull: true,
    },

  }, {
    tableName: 'risk_ratings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['risk_rating_name'],
        name: 'idx_risk_rating_name'
      }
    ]
  });

  RiskRating.associate = (models) => {
    RiskRating.hasMany(models.AuditFinding, { foreignKey: 'risk_rating_id' });
  };

  return RiskRating;
}; 