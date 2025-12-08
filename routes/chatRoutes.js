// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Optional authentication middleware that supports both header and quert header
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization){
    return authenticate(req, res, next);
  }
  if(req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
    return authenticate(req, res, next);
  }

  // No Authentication Provided
  return res.status(401).json({ error: 'Authentication required' });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/chat/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for chat files
  fileFilter: function (req, file, cb) {
    // Allow more file types for chat
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar|mp4|mp3|wav/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('File type not allowed'));
  }
});

// ============ CONVERSATION ROUTES ============

// GET all conversations for logged-in user
router.get('/conversations', authenticate, ChatController.getMyConversations);

// POST create new conversation (direct or group)
router.post('/conversations', authenticate, ChatController.createConversation);

// GET single conversation details
router.get('/conversations/:id', authenticate, ChatController.getConversation);

// PUT update conversation (group name, description)
router.put('/conversations/:id', authenticate, ChatController.updateConversation);

// POST add participants to group
router.post('/conversations/:id/participants', authenticate, ChatController.addParticipants);

router.post('/conversations/:id/members', authenticate, ChatController.addParticipants);

// DELETE remove participant from group
router.delete('/conversations/:id/participants/:participantId', authenticate, ChatController.removeParticipant);

// ============ MESSAGE ROUTES ============

// GET messages for a conversation
router.get('/conversations/:id/messages', authenticate, ChatController.getMessages);

// POST send message to conversation (with optional file attachments)
router.post('/conversations/:id/messages', authenticate, upload.array('files', 5), ChatController.sendMessage);

// PUT edit a message
router.put('/messages/:messageId', authenticate, ChatController.editMessage);

// DELETE a message (soft delete)
router.delete('/messages/:messageId', authenticate, ChatController.deleteMessage);

// POST mark messages as read
router.post('/conversations/:id/mark-read', authenticate, ChatController.markAsRead);

// ============ MESSAGE REACTIONS ============

// POST add reaction to message
router.post('/messages/:messageId/reactions', authenticate, ChatController.addReaction);

// DELETE remove reaction from message
router.delete('/messages/:messageId/reactions', authenticate, ChatController.removeReaction);

// GET all reactions for a message
router.get('/messages/:messageId/reactions', authenticate, ChatController.getMessageReactions);

// ============ MESSAGE FORWARDING ============

// POST forward message to other conversations
router.post('/messages/:messageId/forward', authenticate, ChatController.forwardMessage);

// ============ ATTACHMENT ROUTES ============

// GET download attachment
router.get('/attachments/:attachmentId/download', optionalAuth, ChatController.downloadAttachment);

// ============ UTILITY ROUTES ============

// GET unread message count
router.get('/unread-count', authenticate, ChatController.getUnreadCount);

// GET search messages
router.get('/search', authenticate, ChatController.searchMessages);

module.exports = router;

