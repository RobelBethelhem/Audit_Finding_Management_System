const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

// Import all routers
const auditFindingsRouter = require('./routes/auditFindingsRoutes');
const actionPlansRouter = require('./routes/actionPlansRoutes');
const userRouter = require('./routes/userRoutes');
const referenceDataRouter = require('./routes/ReferenceDataRoutes');
const auditFindingAssignmentRouter = require('./routes/auditFindingAssignmentRoutes');
const escalationRulesRouter = require('./routes/escalationRulesRoutes');
const notificationRouter = require('./routes/notificationRoutes');
const analyticsRouter = require('./routes/analytics');
const branchRouter = require('./routes/branches');
const branchAssignmentRouter = require('./routes/branchAssignmentRoutes');
const inspectorBranchAssignmentRouter = require('./routes/inspectorBranchAssignmentRoutes');
const chatRouter = require('./routes/chatRoutes'); // Chat router

// Import Socket Service
const socketService = require('./services/socketService'); // Socket service

// Manual CORS handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://aps2.zemenbank.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only the following filetypes are allowed: ' + filetypes));
  }
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/ZAMS/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/ZAMS/api/audit-findings', auditFindingsRouter);
app.use('/ZAMS/api/action-plans', actionPlansRouter);
app.use('/ZAMS/api/auth', userRouter);
app.use('/ZAMS/api/users', userRouter);
app.use('/ZAMS/api/reference-data', referenceDataRouter);
app.use('/ZAMS/api/audit-finding-assignments', auditFindingAssignmentRouter);
app.use('/ZAMS/api/escalation-rules', escalationRulesRouter);
app.use('/ZAMS/api/notifications', notificationRouter);
app.use('/ZAMS/api/analytics', analyticsRouter);
app.use('/ZAMS/api/branches', branchRouter);
app.use('/ZAMS/api/branch-assignments', branchAssignmentRouter);
app.use('/ZAMS/api/inspector-branch-assignments', inspectorBranchAssignmentRouter);
app.use('/ZAMS/api/chat', chatRouter); // Chat routes

// Socket.io status endpoint
app.get('/ZAMS/api/socket-status', (req, res) => {
  const socketService = req.app.get('socketService');
  if (socketService && socketService.io) {
    res.json({
      status: 'active',
      onlineUsers: socketService.getOnlineUsers().length,
      serverTime: new Date()
    });
  } else {
    res.status(503).json({
      status: 'inactive',
      message: 'Socket service not initialized'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

// Create necessary directories
const fs = require('fs');
const mainUploadDir = './uploads';
if (!fs.existsSync(mainUploadDir)){
    fs.mkdirSync(mainUploadDir, { recursive: true });
}

const chatUploadDir = './uploads/chat';
if (!fs.existsSync(chatUploadDir)){
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

// Start cron jobs
require('./escalationCronJob');
require('./auditFindingReminderCronJob');
require('./actionPlanReminderCronJob');

// Start server with app.listen for IIS compatibility
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize Socket.io AFTER server starts
  socketService.initialize(server, app);
  console.log(`Socket.io server is active`);
  console.log(`Chat system is ready`);
});