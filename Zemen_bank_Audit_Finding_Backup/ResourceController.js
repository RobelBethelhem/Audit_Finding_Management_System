// controllers/ResourceController.js
const BaseController = require('./BaseController');
const { Resource, ActionPlan } = require('../models');

class ResourceController extends BaseController {
  constructor() {
    super(Resource);
    this.include = [ActionPlan];
  }

  async create(req, res) {
    req.include = this.include;
    return super.create(req, res);
  }

  async findAll(req, res) {
    req.include = this.include;
    return super.findAll(req, res);
  }

  async findById(req, res) {
    req.include = this.include;
    return super.findById(req, res);
  }
}

module.exports = new ResourceController();