// In your routes file
const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const authenticateJWT = require('../middleware/auth');

// Public routes
router.post('/login', userController.login);
router.post('/logout', authenticateJWT, userController.logout);
router.get('/profile', authenticateJWT, userController.getProfile);
// router.put('/profile', authenticate, userController.updateProfile);

// Admin routes
router.get('/', authenticateJWT, userController.findAll);
router.get('/:id', authenticateJWT, userController.findById);
router.post('/', authenticateJWT, userController.create);
router.put('/:id', authenticateJWT, userController.update);
router.delete('/:id', authenticateJWT, userController.delete);

module.exports = router;