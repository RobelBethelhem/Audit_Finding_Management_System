const { Branch, User } = require('../models');
const { Op } = require('sequelize');

class BranchController {
  // Get all branches
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        active_only = 'false' 
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Search functionality
      if (search) {
        whereClause[Op.or] = [
          { branch_code: { [Op.like]: `%${search}%` } },
          { branch_name: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by active status
      if (active_only === 'true') {
        whereClause.is_active = true;
      }

      const { count, rows } = await Branch.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['branch_name', 'ASC']],
        include: [
          {
            model: User,
            as: 'users',
            attributes: ['id', 'username'],
            required: false
          }
        ]
      });

      res.json({
        branches: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({ 
        error: 'Failed to fetch branches',
        details: error.message 
      });
    }
  }

  // Get single branch
  async show(req, res) {
    try {
      const { id } = req.params;
      
      const branch = await Branch.findByPk(id, {
        include: [
          {
            model: User,
            as: 'users',
            attributes: ['id', 'username', 'email', 'role'],
            where: { is_active: true },
            required: false
          }
        ]
      });

      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      res.json(branch);
    } catch (error) {
      console.error('Error fetching branch:', error);
      res.status(500).json({ 
        error: 'Failed to fetch branch',
        details: error.message 
      });
    }
  }

  // Create new branch
  async create(req, res) {
    try {
      const { branch_code, branch_name, is_active = true } = req.body;

      // Validation
      if (!branch_code || !branch_name) {
        return res.status(400).json({ 
          error: 'Branch code and branch name are required' 
        });
      }

      // Check for duplicate branch code
      const existingBranch = await Branch.findOne({
        where: { branch_code: branch_code.toUpperCase() }
      });

      if (existingBranch) {
        return res.status(400).json({ 
          error: 'Branch code already exists' 
        });
      }

      const branch = await Branch.create({
        branch_code: branch_code.toUpperCase(),
        branch_name: branch_name.trim(),
        is_active
      });

      res.status(201).json({
        message: 'Branch created successfully',
        branch
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          error: 'Branch code must be unique'
        });
      }

      res.status(500).json({ 
        error: 'Failed to create branch',
        details: error.message 
      });
    }
  }

  // Update branch
  async update(req, res) {
    try {
      const { id } = req.params;
      const { branch_code, branch_name, is_active } = req.body;

      const branch = await Branch.findByPk(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Check for duplicate branch code (excluding current branch)
      if (branch_code && branch_code !== branch.branch_code) {
        const existingBranch = await Branch.findOne({
          where: { 
            branch_code: branch_code.toUpperCase(),
            id: { [Op.ne]: id }
          }
        });

        if (existingBranch) {
          return res.status(400).json({ 
            error: 'Branch code already exists' 
          });
        }
      }

      const updateData = {};
      if (branch_code) updateData.branch_code = branch_code.toUpperCase();
      if (branch_name) updateData.branch_name = branch_name.trim();
      if (typeof is_active === 'boolean') updateData.is_active = is_active;

      await branch.update(updateData);

      res.json({
        message: 'Branch updated successfully',
        branch
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      res.status(500).json({ 
        error: 'Failed to update branch',
        details: error.message 
      });
    }
  }

  // Soft delete branch
  async destroy(req, res) {
    try {
      const { id } = req.params;

      const branch = await Branch.findByPk(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Check if branch has active users
      const userCount = await User.count({
        where: { 
          branch_id: id,
          is_active: true 
        }
      });

      if (userCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete branch. ${userCount} active user(s) are assigned to this branch.` 
        });
      }

      await branch.update({ is_active: false });

      res.json({
        message: 'Branch deactivated successfully'
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({ 
        error: 'Failed to delete branch',
        details: error.message 
      });
    }
  }

  // Get active branches (for dropdowns)
  async getActive(req, res) {
    try {
      const branches = await Branch.getActiveBranches();
      res.json(branches);
    } catch (error) {
      console.error('Error fetching active branches:', error);
      res.status(500).json({ 
        error: 'Failed to fetch active branches',
        details: error.message 
      });
    }
  }
}

module.exports = new BranchController();
