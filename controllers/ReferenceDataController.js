// controllers/ReferenceDataController.js
const BaseController = require('./BaseController');
const { Category, RiskLevel, RiskRating } = require('../models');

class ReferenceDataController {
  constructor() {
    this.categoryController = new BaseController(Category);
    this.riskLevelController = new BaseController(RiskLevel);
    this.riskRatingController = new BaseController(RiskRating);
  }

  // Category methods
  async createCategory(req, res) {
    return this.categoryController.create(req, res);
  }

  async getCategories(req, res) {
    return this.categoryController.findAll(req, res);
  }

  // Risk Level methods
  async createRiskLevel(req, res) {
    return this.riskLevelController.create(req, res);
  }

  async getRiskLevels(req, res) {
    return this.riskLevelController.findAll(req, res);
  }

  // Risk Rating methods
  async createRiskRating(req, res) {
    return this.riskRatingController.create(req, res);
  }

  async getRiskRatings(req, res) {
    return this.riskRatingController.findAll(req, res);
  }
}

module.exports = new ReferenceDataController();