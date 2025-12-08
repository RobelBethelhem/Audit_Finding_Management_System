const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');
const {authenticate, authorize} = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};

// GET /api/branches - Get all branches (with pagination and search)
router.get('/', authenticate, BranchController.index);

// GET /api/branches/active - Get active branches only (for dropdowns)
router.get('/active', authenticate, BranchController.getActive);

// GET /api/branches/:id - Get single branch
router.get('/:id', authenticate, BranchController.show);

// POST /api/branches - Create new branch (Admin only)
router.post('/', authenticate, BranchController.create);

// PUT /api/branches/:id - Update branch (Admin only)
router.put('/:id', authenticate, isAdmin, BranchController.update);

// DELETE /api/branches/:id - Soft delete branch (Admin only)
router.delete('/:id', authenticate, isAdmin, BranchController.destroy);

module.exports = router;
