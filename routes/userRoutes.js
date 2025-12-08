// In your routes file
const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
// const authenticateJWT = require('../middleware/auth');

const {authenticate, authorize} = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};


const isSupervisor = (req, res, next) => {
  if(req.user && (req.user.role.includes('Inspection_Auditees_Supervisor') || req.user.role.includes('Auditee_Supervisor') || req.user.role.includes('IT_Auditees_Supervisor'))){
    next();
  }else{
    res.status(403).json({ error: 'Access denied. First Level Supervisor privileges required.' });
  }
};

// Public routes
router.post('/login', userController.login);

// router.post('/login', async (req, res, next) => {
//   try {
//     await userController.login(req, res);
//   } catch (error) {
//     // Only send error response if headers haven't been sent
//     if (!res.headersSent) {
//       console.error('Route handler error:', error);
//       res.status(500).json({
//         error: 'Login failed',
//         message: 'An unexpected error occurred'
//       });
//     }
//   }
// });


router.get('/session', authenticate, userController.checkSession);
router.post('/logout', authenticate, userController.logout);
router.get('/profile', authenticate, userController.getProfile);
// router.put('/profile', authenticate, userController.updateProfile);

// Assignment routes - for getting assignable users in same department
router.get('/assignable-users', authenticate, userController.getAssignableUsers);
router.get('/assignable-users_by_branch', authenticate, authorize('IT_Auditees_Supervisor', 'Inspection_Auditees_Supervisor', 'Auditee_Supervisor'), userController.getAssignableUsersByBranch);

// Branch routes - for getting user's associated branch
router.get('/:userId/branch', authenticate, userController.getUserBranch);

// Admin routes - now with admin authorization check
router.get('/', authenticate, userController.findAll);
router.get('/:id', authenticate, authorize('Admin'), userController.findById);
router.post('/', authenticate, userController.create);
router.put('/:id', authenticate, authorize('Admin', 'Inspection_Auditors_Supervisor', 'Audit_Supervisor', 'IT_Auditors_Supervisor'), userController.update);
router.delete('/:id', authenticate, authorize('Admin'), userController.delete);


router.get('sessions', authenticate, authorize('Admin'), userController.getActiveSessions);
router.post('/force-logout/:userId', authenticate, authorize('Admin'), userController.forceLogout);
module.exports = router;
