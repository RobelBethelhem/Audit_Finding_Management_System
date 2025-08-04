const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const BaseController = require('./BaseController');
const { User, Branch } = require('../models');
const TokenService = require('../services/tokenService');

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  // Override create to handle password hashing
  async create(req, res) {
    try {
      const { username, email, password, role, department, supervisor_id } = req.body;

      // Validate required fields
      if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Username, email, password, and role are required' });
      }

      // Check for existing user
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }]
        }
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        if (existingUser.email === email) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role,
        department,
        supervisor: supervisor_id || null, // Convert empty string to null
        is_active: true
      });

      // Don't send password hash in response
      const { password: _, ...userData } = user.get({ plain: true });
      res.status(201).json(userData);

    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({ error: 'Error creating user' });
    }
  }

  // Override update to handle password hashing
  async update(req, res) {
    try {
      const { id } = req.params;
      console.log("IIIIIIDDDDDD", id);
      const { password, supervisor_id, ...updateData } = req.body;

      // Find user
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Map supervisor_id to supervisor field
      if (supervisor_id !== undefined) {
        updateData.supervisor = supervisor_id || null; // Convert empty string to null
      }

      // Hash new password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      // Check for duplicate username or email
      if (updateData.username || updateData.email) {
        const whereCondition = { id: { [Op.ne]: id } };
        
        if (updateData.username) {
          whereCondition.username = updateData.username;
        }
        if (updateData.email) {
          whereCondition.email = updateData.email;
        }

        const existingUser = await User.findOne({ where: whereCondition });
        if (existingUser) {
          if (existingUser.username === updateData.username) {
            return res.status(400).json({ error: 'Username already in use' });
          }
          if (existingUser.email === updateData.email) {
            return res.status(400).json({ error: 'Email already in use' });
          }
        }
      }

      // Update user
      await user.update(updateData);

      // Don't send password hash in response
      const { password: _, ...userData } = user.get({ plain: true });
      res.json(userData);

    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ error: 'Error updating user' });
    }
  }

  // Get all users with pagination and filtering
  async findAll(req, res) {
    try {
      const { page = 1, limit = 10, role, department, is_active, search } = req.query;
      const offset = (page - 1) * limit;
      
      const where = {};
      
      if (role) where.role = role;
      if (department) where.department = department;
      if (is_active !== undefined) where.is_active = is_active === 'true';
      
      if (search) {
        where[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name', 'is_active'],
            required: false
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Error fetching users' });
    }
  }

  // Get single user by ID
  async findById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: User,
            as: 'mySupervisor',
            attributes: ['id', 'username', 'email']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name', 'is_active'],
            required: false
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Error fetching user' });
    }
  }

  // Soft delete user
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't allow deleting admin users
      if (user.role === 'Admin') {
        return res.status(403).json({ error: 'Cannot delete admin user' });
      }

      await user.destroy();
      res.json({ message: 'User deleted successfully' });

    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Error deleting user' });
    }
  }

  // Update user status (active/inactive)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't allow deactivating admin users
      if (user.role === 'Admin' && !is_active) {
        return res.status(403).json({ error: 'Cannot deactivate admin user' });
      }

      user.is_active = is_active;
      await user.save();

      res.json({ 
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_active: user.is_active
        }
      });

    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Error updating user status' });
    }
  }



  // Add these methods to your UserController class

// User login
async login(req, res) {
    try {
      const { username, password } = req.body;
  
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
  
      // Find user by username
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }
  
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Generate token
      const token = TokenService.generateToken(user);
  
      // Update last login
      user.last_login = new Date();
      await user.save();
  
      // Don't send password in response
      const { password: _, ...userData } = user.get({ plain: true });
  
      res.json({
        user: userData,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      });
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
  
  // User logout
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const userId = req.user?.id;
  
      if (token && userId) {
        await TokenService.revokeToken(token, userId);
      }
  
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
  
  // Get current user's profile
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name', 'is_active'],
            required: false
          }
        ]
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
  
  // Update current user's profile
  async updateProfile(req, res) {
    try {
      const { password, ...updateData } = req.body;
      const userId = req.user.id;
  
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
  
      // Update user
      await user.update(updateData);
  
      // Don't send password in response
      const { password: _, ...userData } = user.get({ plain: true });
      res.json(userData);
  
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // Get users by role
  async getByRole(req, res) {
    try {
      const { role } = req.params;
      const users = await User.findAll({
        where: {
          role,
          is_active: true
        },
        attributes: ['id', 'username', 'email'],
        order: [['username', 'ASC']]
      });

      res.json(users);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      res.status(500).json({ error: 'Error fetching users by role' });
    }
  }



  
  // Get assignable users in the same department (for assignment purposes)
  async getAssignableUsers(req, res) {
    try {
      const currentUser = req.user;
      const { limit = 1000, is_active = true } = req.query;

      // Define assignable roles
      const assignableRoles = ['Auditees', 'IT_Auditees', 'Inspection_Auditees'];

      // Build department filter based on current user's department
      let departmentFilter;
      if (currentUser.department === 'Inspection') {
        // Inspection users can see users from Business and Inspection departments (exclude IT_Audit)
        departmentFilter = { [Op.in]: ['Business', 'Inspection'] };
      } else {
        // All other departments: show users from same department only
        departmentFilter = currentUser.department;
      }

      const users = await User.findAll({
        where: {
          department: departmentFilter,
          role: { [Op.in]: assignableRoles },
          is_active: is_active === 'true',
          id: { [Op.ne]: currentUser.id }
        },
        attributes: ['id', 'username', 'email', 'role', 'department'],
        order: [['username', 'ASC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Error fetching assignable users:', error);
      res.status(500).json({ error: 'Error fetching assignable users' });
    }
  }



   async getAssignableUsersByBranch(req, res) {
    try {
      const currentUser = req.user;
      const { limit = 1000, is_active = true } = req.query;

      // Define assignable roles
      const assignableRoles = ['Auditees', 'IT_Auditees', 'Inspection_Auditees'];

      const branch_id = currentUser.branch_id;

      if (!branch_id) {
        return res.status(400).json({ error: 'Branch ID is required' });
      }

      // Build department filter based on current user's department
      let departmentFilter;
      if (currentUser.department === 'Inspection') {
        // Inspection users can see users from Business and Inspection departments (exclude IT_Audit)
        departmentFilter = { [Op.in]: ['Business', 'Inspection'] };
      } else {
        // All other departments: show users from same department only
        departmentFilter = currentUser.department;
      }

      const users = await User.findAll({
        where: {
          branch_id: branch_id,
          department: departmentFilter,
          role: { [Op.in]: assignableRoles },
          is_active: is_active === 'true',
          id: { [Op.ne]: currentUser.id }
        },
        attributes: ['id', 'username', 'email', 'role', 'department'],
        order: [['username', 'ASC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Error fetching assignable users:', error);
      res.status(500).json({ error: 'Error fetching assignable users' });
    }
  }


  // Get user's associated branch
  async getUserBranch(req, res) {
    try {
      const { userId } = req.params;

      // Validate user ID
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'branch_id'],
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'branch_code', 'branch_name', 'is_active'],
            required: false
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.branch) {
        return res.status(404).json({ error: 'No branch assigned to this user' });
      }

      res.json({
        success: true,
        branch: user.branch
      });
    } catch (error) {
      console.error('Error getting user branch:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }





}

module.exports = new UserController();





