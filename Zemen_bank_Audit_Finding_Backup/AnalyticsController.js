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
    const { startDate, endDate, department } = req.query;

    // Build where clause for date filtering
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Build include clause for department filtering
    const includeClause = [];
    if (department) {
      includeClause.push({
        model: User,
        as: 'createdBy',
        attributes: [],
        where: { department },
        required: true
      });
    }

    const statusStats = await AuditFinding.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      where: whereClause,
      include: includeClause,
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
    const { startDate, endDate, department } = req.query;

    // Build where clause for date filtering
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Build include clause
    const includeClause = [
      {
        model: RiskLevel,
        as: 'riskLevel',
        attributes: ['risk_level_name'],
        required: true
      }
    ];

    // Add department filtering if specified
    if (department) {
      includeClause.push({
        model: User,
        as: 'createdBy',
        attributes: [],
        where: { department },
        required: true
      });
    }

    const riskLevelStats = await AuditFinding.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      where: whereClause,
      include: includeClause,
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
    const { startDate, endDate } = req.query;

    // Build where clause for date filtering
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

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
      where: whereClause,
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
    const { startDate, endDate, groupBy = 'month', department } = req.query;

    const whereClause = {
      created_at: {
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

    // Build include clause for department filtering
    const includeClause = [];
    if (department) {
      includeClause.push({
        model: User,
        as: 'createdBy',
        attributes: [],
        where: { department },
        required: true
      });
    }

    const trendsData = await AuditFinding.findAll({
      attributes: [
        [Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFinding.created_at'), dateFormat), 'period'],
        [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
      ],
      where: whereClause,
      include: includeClause,
      group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFinding.created_at'), dateFormat)],
      order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('AuditFinding.created_at'), dateFormat), 'ASC']],
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
    const { startDate, endDate, department } = req.query;

    // Build where clause for date filtering
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Build include clause for department filtering through audit finding
    const includeClause = [];
    if (department) {
      includeClause.push({
        model: AuditFinding,
        attributes: [],
        include: [{
          model: User,
          as: 'createdBy',
          attributes: [],
          where: { department },
          required: true
        }],
        required: true
      });
    }

    const actionPlanStats = await ActionPlan.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('ActionPlan.action_plan_id')), 'count']
      ],
      where: whereClause,
      include: includeClause,
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
    const { startDate, endDate, department } = req.query;

    // Build where clause for date filtering on audit findings
    const auditFindingWhere = {
      status: {
        [Op.notIn]: ['Resolved', 'Closed']
      }
    };

    if (startDate && endDate) {
      auditFindingWhere.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Build user where clause for department filtering
    const userWhere = {};
    if (department) {
      userWhere.department = department;
    }

    const workloadData = await User.findAll({
      attributes: [
        'id',
        'username',
        'department',
        [Sequelize.fn('COUNT', Sequelize.col('assignedFindings.assigned_id')), 'assigned_count']
      ],
      where: userWhere,
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
              where: auditFindingWhere,
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
    const { startDate, endDate, department } = req.query;

    // Build where clause for date filtering
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Build include clause for department filtering
    const departmentInclude = department ? [{
      model: User,
      as: 'createdBy',
      attributes: [],
      where: { department },
      required: true
    }] : [];

    // Get all analytics data in parallel
    const [
      statusStats,
      departmentStats,
      actionPlanStats,
      workloadData
    ] = await Promise.all([
      AuditFinding.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('AuditFinding.id')), 'count']
        ],
        where: whereClause,
        include: departmentInclude,
        group: ['status'],
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
            where: department ? { department } : {},
            required: true
          }
        ],
        where: whereClause,
        group: ['createdBy.department'],
        raw: true
      }),
      ActionPlan.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('ActionPlan.action_plan_id')), 'count']
        ],
        where: whereClause,
        include: department ? [{
          model: AuditFinding,
          attributes: [],
          include: [{
            model: User,
            as: 'createdBy',
            attributes: [],
            where: { department },
            required: true
          }],
          required: true
        }] : [],
        group: ['status'],
        raw: true
      }),
      User.findAll({
        attributes: [
          'username',
          [Sequelize.fn('COUNT', Sequelize.col('assignedFindings.assigned_id')), 'assigned_count']
        ],
        where: department ? { department } : {},
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
        department_distribution: departmentStats,
        action_plan_metrics: actionPlanStats,
        workload_distribution: workloadData,
        escalation_metrics: { total_escalations: 0 }
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
