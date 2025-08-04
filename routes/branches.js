const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');
const authenticateJWT = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// GET /api/branches - Get all branches (with pagination and search)
router.get('/', authenticateJWT, BranchController.index);

// GET /api/branches/active - Get active branches only (for dropdowns)
router.get('/active', authenticateJWT, BranchController.getActive);

// GET /api/branches/:id - Get single branch
router.get('/:id', authenticateJWT, BranchController.show);

// POST /api/branches - Create new branch (Admin only)
router.post('/', authenticateJWT, isAdmin, BranchController.create);

// PUT /api/branches/:id - Update branch (Admin only)
router.put('/:id', authenticateJWT, isAdmin, BranchController.update);

// DELETE /api/branches/:id - Soft delete branch (Admin only)
router.delete('/:id', authenticateJWT, isAdmin, BranchController.destroy);

module.exports = router;
