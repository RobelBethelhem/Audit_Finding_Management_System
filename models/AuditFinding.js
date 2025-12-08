const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AuditFinding = sequelize.define('AuditFinding', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    criteria: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cause:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    impact:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    recommendation:{
      type: DataTypes.STRING,
      allowNull: false,
    },

    amount:{
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    currency: {
      type: DataTypes.ENUM('ETB', 'USD', 'GBP', 'EUR'),
      defaultValue: 'ETB',
      allowNull: false,
    },

    risk_level_id:{
      type: DataTypes.UUID,
      allowNull: true,
    },
    
    category_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    
    risk_rating_id:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_by_id: { 
      type: DataTypes.UUID,
      allowNull: false,
    },
   

    status:{
      type: DataTypes.ENUM('Pending', 'Under_Rectification', 'In_Progress', 'Reviewed', 'Escalated', 'Resolved', 'Lesson_Taken'),
      defaultValue: 'Pending'
    },

    rectification_id:{
      type: DataTypes.UUID,
      allowNull: true,
    },

    // Reference number field
    reference_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },

    // New columns for IT_Audit department
    vulnerability_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    compliance_gap_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    business_compliance_gap_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    standard_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    // Additional fields for audit finding management
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

  }, {
    tableName: 'audit_findings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['risk_level_id'],
        name: 'idx_audit_finding_risk_level'
      },
      {
        fields: ['category_id'],
        name: 'idx_audit_finding_category'
      },
      {
        fields: ['risk_rating_id'],
        name: 'idx_audit_finding_risk_rating'
      }
    ]
  });

  AuditFinding.associate = (models) => {
    AuditFinding.belongsTo(models.Category, { foreignKey: 'category_id' });
    AuditFinding.belongsTo(models.RiskLevel, { foreignKey: 'risk_level_id' });
    AuditFinding.belongsTo(models.RiskRating, { foreignKey: 'risk_rating_id' });
    AuditFinding.belongsTo(models.User, { as: 'createdBy', foreignKey: 'created_by_id' });
    AuditFinding.hasMany(models.AuditFindingAssigned, { foreignKey: 'finding_id' });
    AuditFinding.hasMany(models.AuditFindingEscalation, { foreignKey: 'finding_id' });
    AuditFinding.hasMany(models.AuditFindingRectification, { foreignKey: 'finding_id' });
    AuditFinding.hasMany(models.AuditAmendmentHistory, { foreignKey: 'audit_finding_id' });
    AuditFinding.hasMany(models.ActionPlan, { foreignKey: 'audit_finding_id' });
    AuditFinding.hasMany(models.AuditFindingEvidence, { foreignKey: 'audit_finding_id', as: 'evidences' });

    // New associations for IT_Audit specific columns
    AuditFinding.belongsTo(models.SystemVulnerability, { foreignKey: 'vulnerability_id', as: 'SystemVulnerability' });
    AuditFinding.belongsTo(models.ComplianceGap, { foreignKey: 'compliance_gap_id', as: 'ComplianceGap' });
    AuditFinding.belongsTo(models.BusinessComplianceGap, { foreignKey: 'business_compliance_gap_id', as: 'BusinessComplianceGap' });
    AuditFinding.belongsTo(models.RelevantStandard, { foreignKey: 'standard_id', as: 'RelevantStandard' });
    AuditFinding.hasMany(models.AssignedNotification, { foreignKey: 'audit_finding_id' });
    AuditFinding.hasMany(models.EscalationNotification, { foreignKey: 'audit_finding_id' });

    // Normalized branch assignment association
    AuditFinding.hasOne(models.AuditFindingBranchAssignment, {
      foreignKey: 'audit_finding_id',
      as: 'branchAssignment'
    });

    // Assignment relationships are handled through AuditFindingAssigned table
    // Branch assignments are handled through AuditFindingBranchAssignment table
  };



















  // Static method to generate reference number
  // AuditFinding.generateReferenceNumber = async function(branchCode, department) {
  //   const { Op } = require('sequelize');
  //   const currentYear = new Date().getFullYear();

  //   // Get the count of findings for this branch/department/year combination
  //   const count = await this.count({
  //     where: {
  //       reference_number: {
  //         [Op.like]: `${branchCode}/${department}/${currentYear}/%`
  //       }
  //     }
  //   });

  //   // Generate sequence number (6 digits, zero-padded)
  //   const sequence = String(count + 1).padStart(6, '0');

  //   return `${branchCode}/${department}/${currentYear}/${sequence}`;
  // };


  AuditFinding.generateReferenceNumber = async function(branchCode, department, transaction) {
  const { Op } = require('sequelize');
  const currentYear = new Date().getFullYear();
  const prefix = `${branchCode}/${department}/${currentYear}/`;

  // Find the highest sequence number with row locking
  const lastFinding = await this.findOne({
    where: {
      reference_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['reference_number', 'DESC']],
    lock: transaction ? transaction.LOCK.UPDATE : true,
    transaction: transaction
  });

  let sequence = 1;
  if (lastFinding && lastFinding.reference_number) {
    // Extract the last sequence number
    const parts = lastFinding.reference_number.split('/');
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    sequence = lastSequence + 1;
  }

  // Generate sequence number (6 digits, zero-padded)
  const sequenceStr = String(sequence).padStart(6, '0');

  return `${prefix}${sequenceStr}`;
};



  return AuditFinding;
}; 
