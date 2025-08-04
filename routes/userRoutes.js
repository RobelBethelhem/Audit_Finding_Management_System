// In your routes file
const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const authenticateJWT = require('../middleware/auth');

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
router.post('/logout', authenticateJWT, userController.logout);
router.get('/profile', authenticateJWT, userController.getProfile);
// router.put('/profile', authenticate, userController.updateProfile);

// Assignment routes - for getting assignable users in same department
router.get('/assignable-users', authenticateJWT, userController.getAssignableUsers);
router.get('/assignable-users_by_branch', authenticateJWT, isSupervisor, userController.getAssignableUsersByBranch);

// Branch routes - for getting user's associated branch
router.get('/:userId/branch', authenticateJWT, userController.getUserBranch);

// Admin routes - now with admin authorization check
router.get('/', authenticateJWT, isAdmin, userController.findAll);
router.get('/:id', authenticateJWT, isAdmin, userController.findById);
router.post('/', authenticateJWT, isAdmin, userController.create);
router.put('/:id', authenticateJWT, isAdmin, userController.update);
router.delete('/:id', authenticateJWT, isAdmin, userController.delete);

module.exports = router;
