// models/ActionPlan.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionPlan extends Model {
    static associate(models) {
      // Check if models exist before creating associations
      if (models.User) {
        ActionPlan.belongsTo(models.User, {
          foreignKey: 'submitted_by_id',
          as: 'submittedBy'
        });
      }
      
      if (models.AuditFinding) {
        ActionPlan.belongsTo(models.AuditFinding, {
          foreignKey: 'audit_finding_id'
        });
      }
      
      if (models.ActionPlanResponsiblePerson) {
        ActionPlan.hasMany(models.ActionPlanResponsiblePerson, {
          foreignKey: 'action_plan_id',
          as: 'responsiblePersons'
        });
      }
      
      if (models.ActionPlanResource) {
        ActionPlan.hasMany(models.ActionPlanResource, {
          foreignKey: 'action_plan_id',
          as: 'resources'
        });
      }
      
      if (models.ActionPlanEvidence) {
        ActionPlan.hasMany(models.ActionPlanEvidence, {
          foreignKey: 'action_plan_id',
          as: 'evidences'
        });
      }
      
      if (models.ActionPlanAmendmentHistory) {
        ActionPlan.hasMany(models.ActionPlanAmendmentHistory, {
          foreignKey: 'action_plan_id',
          as: 'amendmentHistory'
        });
      }
    }
  }

  ActionPlan.init({
    action_plan_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    audit_finding_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    action_plan: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    timeline: {
      type: DataTypes.STRING,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Overdue', 'In_Progress', 'Completed'),
      defaultValue: 'Pending',
      allowNull: false
    },
    submitted_by_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    progress_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    progress_justification: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ActionPlan',
    tableName: 'action_plans',
    underscored: true,
    timestamps: true,
    defaultScope: {
      attributes: {
        exclude: ['primary_evidence_id', 'primary_resource_id']
      }
    },
    scopes: {
      withoutEvidenceResource: {
        attributes: {
          exclude: ['primary_evidence_id', 'primary_resource_id']
        }
      }
    }
  });

  return ActionPlan;
};
