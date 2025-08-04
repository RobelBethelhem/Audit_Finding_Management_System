const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const RelevantStandard = sequelize.define('RelevantStandard', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    standard_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    standard_description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    issuing_body: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    tableName: 'relevant_standards',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['standard_name'],
        name: 'idx_standard_name'
      }
    ]
  });

  RelevantStandard.associate = (models) => {
    RelevantStandard.hasMany(models.AuditFinding, { foreignKey: 'standard_id' });
  };

  return RelevantStandard;
};