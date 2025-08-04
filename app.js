const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
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

// Manual CORS handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
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
    cb(null, 'uploads/') // Make sure this directory exists
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/audit-findings', auditFindingsRouter);
app.use('/api/action-plans', actionPlansRouter);
app.use('/auth', userRouter);
app.use('/api/users', userRouter); // Add API route for user operations
app.use('/api/reference-data', referenceDataRouter);
app.use('/api/audit-finding-assignments', auditFindingAssignmentRouter);
app.use('/api/escalation-rules', escalationRulesRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/branches', branchRouter);
app.use('/api/branch-assignments', branchAssignmentRouter);
app.use('/api/inspector-branch-assignments', inspectorBranchAssignmentRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const fs = require('fs');
const dir = './uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

require('./escalationCronJob'); // This will start the escalation cron job when your app starts
require('./auditFindingReminderCronJob'); // This will start the audit finding reminder cron job when your app starts
require('./actionPlanReminderCronJob'); // This will start the action plan reminder cron job when your app starts

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
