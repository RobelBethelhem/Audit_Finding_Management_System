const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const BaseController = require('./BaseController');
const { User, Branch, ActiveSession } = require('../models');
const TokenService = require('../services/TokenService');

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

      if(updateData.branch_id === '' || updateData.branch_id === 'no-branch') {
        updateData.branch_id = null; 
      }

      // Update user
      await user.update(updateData);

      // Don't send password hash in response
      const { password: _, ...userData } = user.get({ plain: true });
      res.json(userData);

    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ error: `Error updating user ${error}` });
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
// async login(req, res) {
//     try {
//       const { username, password } = req.body;
  
//       // Validate input
//       if (!username || !password) {
//         return res.status(400).json({ error: 'Username and password are required' });
//       }
  
//       // Find user by username
//       const user = await User.findOne({ where: { username } });
//       if (!user) {
//         return res.status(401).json({ error: 'Invalid credentials' });
//       }
  
//       // Check if user is active
//       if (!user.is_active) {
//         return res.status(403).json({ error: 'Account is deactivated' });
//       }
  
//       // Verify password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid) {
//         return res.status(401).json({ error: 'Invalid credentials' });
//       }
  
//       // Generate token
//       const token = TokenService.generateToken(user);
  
//       // Update last login
//       user.last_login = new Date();
//       await user.save();
  
//       // Don't send password in response
//       const { password: _, ...userData } = user.get({ plain: true });
  
//       res.json({
//         user: userData,
//         token,
//         expiresIn: process.env.JWT_EXPIRES_IN || '24h'
//       });
  
//     } catch (error) {
//       console.error('Login error:', error);
//       res.status(500).json({ error: 'Login failed' });
//     }
//   }


async login(req, res) {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Request body:', req.body);
  
  try {
    const { username, password, force = false } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    console.log('Finding user:', username);
    // Find user by username
    const user = await User.findOne({ where: { username } });
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    console.log('User found:', user.id);

    // Check if user is active - FIX: Check for string 'Active' not boolean
    if (!user.is_active) {
      console.log('User not active:', user.is_active);
      return res.status(403).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    console.log('Verifying password...');
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    console.log('Password valid');

    console.log('Checking for active session...');
    // Check for existing active session
    const hasActiveSession = await TokenService.hasActiveSession(user.id);
    console.log('Has active session:', hasActiveSession);
    
    if (hasActiveSession && !force) {
      console.log('Active session exists, requesting force login');
      // User already has an active session
      const sessionInfo = await TokenService.getSessionInfo(user.id);
      
      return res.status(409).json({ 
        error: 'User already logged in',
        code: 'ACTIVE_SESSION_EXISTS',
        message: 'You are already logged in from another device/browser. Would you like to force logout from the other session?',
        sessionInfo: sessionInfo ? {
          lastActivity: sessionInfo.lastActivity,
          ipAddress: sessionInfo.ipAddress,
          deviceInfo: sessionInfo.deviceInfo,
          loginTime: sessionInfo.createdAt
        } : null,
        requiresForce: true
      });
    }

    // If force=true, the old session will be automatically invalidated
    if (hasActiveSession && force) {
      console.log(`Force login requested for user ${user.username}. Invalidating old session.`);
    }

    console.log('Generating token...');
    // Generate new token
    const token = TokenService.generateToken(user);
    console.log('Token generated');

    // Extract request info for session tracking
    const requestInfo = {
      ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      // device: this.detectDevice(req.headers['user-agent'])
      device: "windows"
    };
    console.log('Request info:', requestInfo);

    console.log('Creating user session...');
    // Create new session (this will remove any existing session)
    await TokenService.createUserSession(user, token, requestInfo);
    console.log('Session created');

    // Update last login
    user.last_login = new Date();
    await user.save();
    console.log('User last_login updated');

    // Don't send password in response
    const { password: _, ...userData } = user.get({ plain: true });

    console.log('Login successful for user:', username);
    res.json({
      success: true,
      user: userData,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      message: force ? 'Logged in successfully. Previous session has been terminated.' : 'Logged in successfully'
    });

  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Login failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}



// async login(req, res) {
//   console.log('=== LOGIN ATTEMPT ===');
//   console.log('Request body:', req.body);
  
//   try {
//     const { username, password, force = false } = req.body;

//     // Validate input
//     if (!username || !password) {
//       console.log('Missing username or password');
//       return res.status(400).json({ 
//         error: 'Username and password are required' 
//       });
//     }

//     console.log('Finding user:', username);
//     // Find user by username
//     const user = await User.findOne({ where: { username } });
//     if (!user) {
//       console.log('User not found');
//       return res.status(401).json({ 
//         error: 'Invalid credentials' 
//       });
//     }
//     console.log('User found:', user.id);

//     // Check if user is active
//     if (!user.is_active) {
//       console.log('User not active:', user.is_active);
//       return res.status(403).json({ 
//         error: 'Account is deactivated',
//         code: 'ACCOUNT_DEACTIVATED'
//       });
//     }

//     console.log('Verifying password...');
//     // Verify password
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       console.log('Invalid password');
//       return res.status(401).json({ 
//         error: 'Invalid credentials' 
//       });
//     }
//     console.log('Password valid');

//     console.log('Checking for active session...');
//     // Check for existing active session
//     const hasActiveSession = await TokenService.hasActiveSession(user.id);
//     console.log('Has active session:', hasActiveSession);
    
//     if (hasActiveSession && !force) {
//       console.log('Active session exists, requesting force login');
//       // User already has an active session
//       const sessionInfo = await TokenService.getSessionInfo(user.id);
      
//       return res.status(409).json({ 
//         error: 'User already logged in',
//         code: 'ACTIVE_SESSION_EXISTS',
//         message: 'You are already logged in from another device/browser. Would you like to force logout from the other session?',
//         sessionInfo: sessionInfo ? {
//           lastActivity: sessionInfo.lastActivity,
//           ipAddress: sessionInfo.ipAddress,
//           deviceInfo: sessionInfo.deviceInfo,
//           loginTime: sessionInfo.createdAt
//         } : null,
//         requiresForce: true
//       });
//     }

//     // If force=true, the old session will be automatically invalidated
//     if (hasActiveSession && force) {
//       console.log(`Force login requested for user ${user.username}. Invalidating old session.`);
//     }

//     console.log('Generating token...');
//     // Generate new token
//     const token = TokenService.generateToken(user);
//     console.log('Token generated');

//     // Extract request info for session tracking
//     const requestInfo = {
//       ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
//       userAgent: req.headers['user-agent'],
//       device: "windows"
//     };
//     console.log('Request info:', requestInfo);

//     console.log('Creating user session...');
//     // Create new session (this will remove any existing session)
//     await TokenService.createUserSession(user, token, requestInfo);
//     console.log('Session created');

//     // Update last login - DON'T AWAIT THIS
//     user.last_login = new Date();
//     user.save().then(() => {
//       console.log('User last_login updated (async)');
//     }).catch(err => {
//       console.error('Failed to update last_login (non-critical):', err);
//     });

//     // Don't send password in response
//     const { password: _, ...userData } = user.get({ plain: true });

//     console.log('Login successful for user:', username);
    
//     // Prepare response
//     const responseData = {
//       success: true,
//       user: userData,
//       token,
//       expiresIn: process.env.JWT_EXPIRES_IN || '24h',
//       message: force ? 'Logged in successfully. Previous session has been terminated.' : 'Logged in successfully'
//     };
    
//     // IMPORTANT: For IIS, we need to be very explicit about the response
//     res.status(200);
//     res.setHeader('Content-Type', 'application/json');
//     res.setHeader('Cache-Control', 'no-cache');
    
//     // Send response using end() instead of json() for IIS compatibility
//     const responseString = JSON.stringify(responseData);
//     console.log('Sending response, length:', responseString.length);
//     res.end(responseString);
    
//     console.log('Response sent successfully');
    
//     // DON'T DO ANYTHING AFTER THIS POINT
    
//   } catch (error) {
//     console.error('=== LOGIN ERROR ===');
//     console.error('Error details:', error);
//     console.error('Stack trace:', error.stack);
    
//     // Make sure we haven't already sent a response
//     if (!res.headersSent) {
//       res.status(500);
//       res.setHeader('Content-Type', 'application/json');
//       res.end(JSON.stringify({ 
//         error: 'Login failed',
//         message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//       }));
//     }
//   }
// }




  

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
      res.status(500).json({ error: `Logout failed ${error}` });
    }
  }



  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      const userId = req.user?.id;

      // Validate inputs
      if (!token) {
        return res.status(400).json({ 
          error: 'No token provided',
          code: 'NO_TOKEN'
        });
      }

      if (!userId) {
        return res.status(400).json({ 
          error: 'User not authenticated',
          code: 'NO_USER'
        });
      }

      // Log logout attempt
      console.log(`Logout attempt for user ${userId}`);

      // Revoke the token and remove session
      const result = await TokenService.revokeToken(token, userId);

      if (result) {
        console.log(`User ${userId} logged out successfully`);
      }

      // Clear any session if exists
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
        });
      }

      res.json({ 
        success: true,
        message: 'Logged out successfully' 
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      if (error.message === 'Invalid token format') {
        return res.status(400).json({ 
          error: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
      }

      res.status(500).json({ 
        error: 'Logout failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }








































   // Check session status
   async checkSession(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Not authenticated',
          hasSession: false
        });
      }

      const sessionInfo = await TokenService.getSessionInfo(userId);
      
      if (!sessionInfo) {
        return res.status(401).json({ 
          error: 'No active session',
          hasSession: false
        });
      }

      res.json({
        hasSession: true,
        session: {
          lastActivity: sessionInfo.lastActivity,
          expiresAt: sessionInfo.expiresAt,
          ipAddress: sessionInfo.ipAddress,
          deviceInfo: sessionInfo.deviceInfo,
          loginTime: sessionInfo.createdAt
        }
      });

    } catch (error) {
      console.error('Check session error:', error);
      res.status(500).json({ 
        error: 'Failed to check session status' 
      });
    }
  }

  // Get active sessions (admin only)
  async getActiveSessions(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'Admin') {
        return res.status(403).json({ 
          error: 'Admin access required' 
        });
      }

      const sessions = await ActiveSession.findAll({
        include: [{
          model: User,
          attributes: ['id', 'username', 'email', 'role']
        }],
        order: [['last_activity', 'DESC']]
      });

      res.json({
        totalActiveSessions: sessions.length,
        sessions: sessions.map(s => ({
          userId: s.user_id,
          username: s.User?.username,
          email: s.User?.email,
          role: s.User?.role,
          ipAddress: s.ip_address,
          deviceInfo: s.device_info,
          lastActivity: s.last_activity,
          loginTime: s.created_at,
          expiresAt: s.expires_at
        }))
      });

    } catch (error) {
      console.error('Error getting active sessions:', error);
      res.status(500).json({ 
        error: 'Failed to get active sessions' 
      });
    }
  }

  // Force logout user (admin only)
  async forceLogout(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user?.id;

      // Check if user is admin
      if (req.user?.role !== 'Admin') {
        return res.status(403).json({ 
          error: 'Admin access required' 
        });
      }

      // Prevent admin from force logging out themselves
      if (userId === adminId) {
        return res.status(400).json({ 
          error: 'Cannot force logout yourself' 
        });
      }

      const result = await TokenService.forceLogoutUser(userId, adminId);

      res.json(result);

    } catch (error) {
      console.error('Force logout error:', error);
      res.status(500).json({ 
        error: 'Failed to force logout user' 
      });
    }
  }

  // Helper function to detect device type
  detectDevice(userAgent) {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile')) return 'Mobile';
    if (ua.includes('tablet')) return 'Tablet';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'Mac';
    if (ua.includes('linux')) return 'Linux';
    
    return 'Desktop';
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
      const assignableRoles = ['Auditees', 'Auditee_Supervisor', 'IT_Auditees', 'Inspection_Auditees'];

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
          // id: { [Op.ne]: currentUser.id }
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





