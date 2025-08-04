const { 
  AuditFinding, 
  User, 
  AuditFindingAssigned, 
  AuditFindingEscalation, 
  ActionPlan, 
  AuditFindingRectification,
  Category, 
  RiskLevel, 
  RiskRating, 
  SystemVulnerability, 
  ComplianceGap, 
  RelevantStandard,
  AssignedNotification,
  EscalationNotification
} = require('../models');
const { Op, Sequelize } = require('sequelize');

// Get audit findings by status
const getAuditFindingsByStatus = async (req, res) => {
  try {
    const statusStats = await AuditFinding.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      success: true,
      data: statusStats
    });
  } catch (error) {
    console.error('Error fetching audit findings by status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit findings statistics'
    });
  }
};

// Get audit findings by risk level
const getAuditFindingsByRiskLevel = async (req, res) => {
  try {
    const riskLevelStats = await AuditFinding.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      include: [
        {
          model: RiskLevel,
          as: 'riskLevel',
          attributes: ['risk_level_name'],
          required: true
        }
      ],
      group: ['riskLevel.risk_level_id', 'riskLevel.risk_level_name'],
      raw: true
    });

    res.json({
      success: true,
      data: riskLevelStats
    });
  } catch (error) {
    console.error('Error fetching audit findings by risk level:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk level statistics'
    });
  }
};

// Get audit findings by department
const getAuditFindingsByDepartment = async (req, res) => {
  try {
    const departmentStats = await AuditFinding.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['department'],
          required: true
        }
      ],
      group: ['createdBy.department'],
      raw: true
    });

    res.json({
      success: true,
      data: departmentStats
    });
  } catch (error) {
    console.error('Error fetching audit findings by department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department statistics'
    });
  }
};

// Get audit findings trends
const getAuditFindingsTrends = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const whereClause = {
      createdAt: {
        [Op.between]: [
          startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Default: last year
          endDate || new Date()
        ]
      }
    };

    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const trendsData = await AuditFinding.findAll({
      attributes: [
        [Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFinding.createdAt'), dateFormat), 'period'],
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      where: whereClause,
      group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFinding.createdAt'), dateFormat)],
      order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFinding.createdAt'), dateFormat), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    console.error('Error fetching audit findings trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends data'
    });
  }
};

// Get action plan metrics
const getActionPlanMetrics = async (req, res) => {
  try {
    const actionPlanStats = await ActionPlan.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('ActionPlan.action_plan_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      success: true,
      data: actionPlanStats
    });
  } catch (error) {
    console.error('Error fetching action plan metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action plan metrics'
    });
  }
};

// Get escalation trends
const getEscalationTrends = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {
      created_at: {
        [Op.between]: [
          startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default: last 90 days
          endDate || new Date()
        ]
      }
    };

    const escalationTrends = await AuditFindingEscalation.findAll({
      attributes: [
        'escalation_level',
        [Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFindingEscalation.created_at'), '%Y-%m-%d'), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('escalation_id')), 'count']
      ],
      where: whereClause,
      group: ['escalation_level', Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFindingEscalation.created_at'), '%Y-%m-%d')],
      order: [['created_at', 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: escalationTrends
    });
  } catch (error) {
    console.error('Error fetching escalation trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escalation trends'
    });
  }
};

// Get user workload distribution
const getUserWorkloadDistribution = async (req, res) => {
  try {
    const workloadData = await User.findAll({
      attributes: [
        'id',
        'username',
        'department',
        [Sequelize.fn('COUNT', Sequelize.col('assignedFindings.assigned_id')), 'assigned_count']
      ],
      include: [
        {
          model: AuditFindingAssigned,
          as: 'assignedFindings',
          attributes: [],
          required: false,
          include: [
            {
              model: AuditFinding,
              as: 'auditFinding',
              attributes: [],
              where: {
                status: {
                  [Op.notIn]: ['Resolved', 'Closed']
                }
              },
              required: false
            }
          ]
        }
      ],
      group: ['User.id', 'User.username', 'User.department'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('assignedFindings.assigned_id')), 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      data: workloadData
    });
  } catch (error) {
    console.error('Error fetching user workload distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workload distribution'
    });
  }
};

// Get compliance gap analysis
const getComplianceGapAnalysis = async (req, res) => {
  try {
    const complianceGapStats = await AuditFinding.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      include: [
        {
          model: ComplianceGap,
          as: 'complianceGap',
          attributes: ['compliance_gap_name'],
          required: true
        }
      ],
      group: ['complianceGap.compliance_gap_id', 'complianceGap.compliance_gap_name'],
      raw: true
    });

    res.json({
      success: true,
      data: complianceGapStats
    });
  } catch (error) {
    console.error('Error fetching compliance gap analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance gap analysis'
    });
  }
};

// Get timeline analytics
const getTimelineAnalytics = async (req, res) => {
  try {
    const timelineStats = await AuditFinding.findAll({
      attributes: [
        'id',
        'title',
        'status',
        'createdAt',
        'due_date',
        [Sequelize.literal('DATEDIFF(due_date, createdAt)'), 'total_days'],
        [Sequelize.literal('DATEDIFF(NOW(), createdAt)'), 'days_elapsed'],
        [Sequelize.literal('CASE WHEN due_date < NOW() AND status NOT IN ("Resolved", "Closed") THEN 1 ELSE 0 END'), 'is_overdue']
      ],
      where: {
        due_date: {
          [Op.not]: null
        }
      },
      order: [['due_date', 'ASC']],
      raw: true
    });

    // Calculate summary statistics
    const summary = {
      total_findings: timelineStats.length,
      overdue_count: timelineStats.filter(item => item.is_overdue === 1).length,
      avg_total_days: timelineStats.reduce((sum, item) => sum + (item.total_days || 0), 0) / timelineStats.length || 0,
      avg_days_elapsed: timelineStats.reduce((sum, item) => sum + (item.days_elapsed || 0), 0) / timelineStats.length || 0
    };

    res.json({
      success: true,
      data: {
        timeline_data: timelineStats,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Error fetching timeline analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timeline analytics'
    });
  }
};

// Get comprehensive dashboard data
const getDashboardData = async (req, res) => {
  try {
    // Get all analytics data in parallel
    const [
      statusStats,
      riskLevelStats,
      departmentStats,
      actionPlanStats,
      workloadData
    ] = await Promise.all([
      AuditFinding.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      AuditFinding.findAll({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
        ],
        include: [
          {
            model: RiskLevel,
            as: 'riskLevel',
            attributes: ['risk_level_name'],
            required: true
          }
        ],
        group: ['riskLevel.risk_level_id', 'riskLevel.risk_level_name'],
        raw: true
      }),
      AuditFinding.findAll({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
        ],
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['department'],
            required: true
          }
        ],
        group: ['createdBy.department'],
        raw: true
      }),
      ActionPlan.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('ActionPlan.action_plan_id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      User.findAll({
        attributes: [
          'username',
          [Sequelize.fn('COUNT', Sequelize.col('assignedFindings.assigned_id')), 'assigned_count']
        ],
        include: [
          {
            model: AuditFindingAssigned,
            as: 'assignedFindings',
            attributes: [],
            required: false,
            include: [
              {
                model: AuditFinding,
                as: 'auditFinding',
                attributes: [],
                where: {
                  status: {
                    [Op.notIn]: ['Resolved', 'Closed']
                  }
                },
                required: false
              }
            ]
          }
        ],
        group: ['User.id', 'User.username'],
        having: Sequelize.literal('assigned_count > 0'),
        order: [[Sequelize.fn('COUNT', Sequelize.col('assignedFindings.assigned_id')), 'DESC']],
        limit: 10,
        raw: true
      })
    ]);

    res.json({
      success: true,
      data: {
        status_distribution: statusStats,
        risk_level_distribution: riskLevelStats,
        department_distribution: departmentStats,
        action_plan_metrics: actionPlanStats,
        workload_distribution: workloadData,
        escalation_metrics: { total_escalations: 0 },
        timeline_metrics: {
          overdue_count: 0,
          total_with_due_date: 0,
          overdue_percentage: '0'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
};

module.exports = {
  getAuditFindingsByStatus,
  getAuditFindingsByRiskLevel,
  getAuditFindingsByDepartment,
  getAuditFindingsTrends,
  getActionPlanMetrics,
  getEscalationTrends,
  getUserWorkloadDistribution,
  getComplianceGapAnalysis,
  getTimelineAnalytics,
  getDashboardData
};
