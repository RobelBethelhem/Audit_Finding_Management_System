const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const auditFindingsRouter = require('./routes/auditFindingsRoutes');
const actionPlansRouter = require('./routes/actionPlansRoutes');
const userRouter = require('./routes/userRoutes')

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

// Add upload middleware to specific routes
app.use('/api/action-plans/upload-evidence', upload.single('file'));

app.use(express.json());

// Routes
app.use('/api/audit-findings', auditFindingsRouter);
app.use('/api/action-plans', actionPlansRouter);
app.use('/auth', userRouter)

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

require('./escalationCronJob'); // This will start the cron job when your app starts

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});