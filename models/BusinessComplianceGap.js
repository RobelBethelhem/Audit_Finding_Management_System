const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const BusinessComplianceGap = sequelize.define('BusinessComplianceGap', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    gap_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gap_description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    regulatory_impact: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    tableName: 'bussiness_compliance_gaps',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['gap_name'],
        name: 'idx_gap_name'
      }
    ]
  });

  BusinessComplianceGap.associate = (models) => {
    BusinessComplianceGap.hasMany(models.AuditFinding, { foreignKey: 'business_compliance_gap_id' });
  };

  return BusinessComplianceGap;
};