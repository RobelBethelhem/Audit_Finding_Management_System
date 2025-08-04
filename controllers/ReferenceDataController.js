// controllers/ReferenceDataController.js
const { Category, RiskLevel, RiskRating, SystemVulnerability, ComplianceGap, BusinessComplianceGap, RelevantStandard, AuditFinding } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Category methods
async function getCategories(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('category_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('category_description')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await Category.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['category_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getCategoryById(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createCategory(req, res) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateCategory(req, res) {
  try {
    const [updated] = await Category.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const updatedCategory = await Category.findByPk(req.params.id);
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
    // Check if category is in use
    const inUseCount = await AuditFinding.count({
      where: { category_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await Category.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Risk Level methods
async function getRiskLevels(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('risk_level_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('risk_level_description')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await RiskLevel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['risk_level_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRiskLevelById(req, res) {
  try {
    const riskLevel = await RiskLevel.findByPk(req.params.id);
    if (!riskLevel) {
      return res.status(404).json({ error: 'Risk level not found' });
    }
    res.json(riskLevel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createRiskLevel(req, res) {
  try {
    const riskLevel = await RiskLevel.create(req.body);
    res.status(201).json(riskLevel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateRiskLevel(req, res) {
  try {
    const [updated] = await RiskLevel.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Risk level not found' });
    }
    const updatedRiskLevel = await RiskLevel.findByPk(req.params.id);
    res.json(updatedRiskLevel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteRiskLevel(req, res) {
  try {
    // Check if risk level is in use
    const inUseCount = await AuditFinding.count({
      where: { risk_level_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete risk level that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await RiskLevel.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Risk level not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Risk Rating methods
async function getRiskRatings(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('risk_rating_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('risk_rating_description')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await RiskRating.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['risk_rating_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRiskRatingById(req, res) {
  try {
    const riskRating = await RiskRating.findByPk(req.params.id);
    if (!riskRating) {
      return res.status(404).json({ error: 'Risk rating not found' });
    }
    res.json(riskRating);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createRiskRating(req, res) {
  try {
    const riskRating = await RiskRating.create(req.body);
    res.status(201).json(riskRating);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateRiskRating(req, res) {
  try {
    const [updated] = await RiskRating.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Risk rating not found' });
    }
    const updatedRiskRating = await RiskRating.findByPk(req.params.id);
    res.json(updatedRiskRating);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteRiskRating(req, res) {
  try {
    // Check if risk rating is in use
    const inUseCount = await AuditFinding.count({
      where: { risk_rating_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete risk rating that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await RiskRating.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Risk rating not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// System Vulnerability methods
async function getSystemVulnerabilities(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('vulnerability_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('vulnerability_description')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('affected_systems')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await SystemVulnerability.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['vulnerability_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getSystemVulnerabilityById(req, res) {
  try {
    const vulnerability = await SystemVulnerability.findByPk(req.params.id);
    if (!vulnerability) {
      return res.status(404).json({ error: 'System vulnerability not found' });
    }
    res.json(vulnerability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createSystemVulnerability(req, res) {
  try {
    console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq", req.body);
    const vulnerability = await SystemVulnerability.create(req.body);
    res.status(201).json(vulnerability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateSystemVulnerability(req, res) {
  try {
    const [updated] = await SystemVulnerability.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'System vulnerability not found' });
    }
    const updatedVulnerability = await SystemVulnerability.findByPk(req.params.id);
    res.json(updatedVulnerability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteSystemVulnerability(req, res) {
  try {
    // Check if vulnerability is in use
    const inUseCount = await AuditFinding.count({
      where: { vulnerability_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete system vulnerability that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await SystemVulnerability.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'System vulnerability not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Compliance Gap methods
async function getComplianceGaps(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('gap_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('gap_description')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('regulatory_impact')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await ComplianceGap.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['gap_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getComplianceGapById(req, res) {
  try {
    const gap = await ComplianceGap.findByPk(req.params.id);
    if (!gap) {
      return res.status(404).json({ error: 'Compliance gap not found' });
    }
    res.json(gap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createComplianceGap(req, res) {
  try {
    const gap = await ComplianceGap.create(req.body);
    res.status(201).json(gap);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateComplianceGap(req, res) {
  try {
    const [updated] = await ComplianceGap.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Compliance gap not found' });
    }
    const updatedGap = await ComplianceGap.findByPk(req.params.id);
    res.json(updatedGap);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteComplianceGap(req, res) {
  try {
    // Check if compliance gap is in use
    const inUseCount = await AuditFinding.count({
      where: { compliance_gap_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete compliance gap that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await ComplianceGap.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Compliance gap not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Relevant Standard methods
async function getRelevantStandards(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('standard_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('standard_description')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('issuing_body')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('version')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await RelevantStandard.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['standard_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRelevantStandardById(req, res) {
  try {
    const standard = await RelevantStandard.findByPk(req.params.id);
    if (!standard) {
      return res.status(404).json({ error: 'Relevant standard not found' });
    }
    res.json(standard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createRelevantStandard(req, res) {
  try {
    const standard = await RelevantStandard.create(req.body);
    res.status(201).json(standard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateRelevantStandard(req, res) {
  try {
    const [updated] = await RelevantStandard.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Relevant standard not found' });
    }
    const updatedStandard = await RelevantStandard.findByPk(req.params.id);
    res.json(updatedStandard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteRelevantStandard(req, res) {
  try {
    // Check if standard is in use
    const inUseCount = await AuditFinding.count({
      where: { standard_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete relevant standard that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await RelevantStandard.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Relevant standard not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}











// Business Compliance Gap methods
async function getBusinessComplianceGaps(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      [Op.or]: [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('gap_name')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('gap_description')), 'LIKE', `%${search.toLowerCase()}%`),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('regulatory_impact')), 'LIKE', `%${search.toLowerCase()}%`)
      ]
    } : {};

    const { count, rows } = await BusinessComplianceGap.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['gap_name', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: rows,
      total: count,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getBusinessComplianceGapById(req, res) {
  try {
    const gap = await BusinessComplianceGap.findByPk(req.params.id);
    if (!gap) {
      return res.status(404).json({ error: 'Compliance gap not found' });
    }
    res.json(gap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createBusinessComplianceGap(req, res) {
  try {

    console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq", req.body);
    const gap = await BusinessComplianceGap.create(req.body);
    res.status(201).json(gap);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateBusinessComplianceGap(req, res) {
  try {
    const [updated] = await BusinessComplianceGap.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Compliance gap not found' });
    }
    const updatedGap = await BusinessComplianceGap.findByPk(req.params.id);
    res.json(updatedGap);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function deleteBusinessComplianceGap(req, res) {
  try {
    // Check if compliance gap is in use
    const inUseCount = await AuditFinding.count({
      where: { business_compliance_gap_id: req.params.id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete compliance gap that is in use by audit findings',
        inUseCount
      });
    }
    
    const deleted = await BusinessComplianceGap.destroy({
      where: { id: req.params.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Compliance gap not found' });
    }
    
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Export all functions
module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getRiskLevels,
  getRiskLevelById,
  createRiskLevel,
  updateRiskLevel,
  deleteRiskLevel,
  getRiskRatings,
  getRiskRatingById,
  createRiskRating,
  updateRiskRating,
  deleteRiskRating,
  getSystemVulnerabilities,
  getSystemVulnerabilityById,
  createSystemVulnerability,
  updateSystemVulnerability,
  deleteSystemVulnerability,
  getComplianceGaps,
  getComplianceGapById,
  createComplianceGap,
  updateComplianceGap,
  deleteComplianceGap,
  getRelevantStandards,
  getRelevantStandardById,
  createRelevantStandard,
  updateRelevantStandard,
  deleteRelevantStandard,
  getBusinessComplianceGaps,
  getBusinessComplianceGapById,
  createBusinessComplianceGap,
  updateBusinessComplianceGap,
  deleteBusinessComplianceGap
}
