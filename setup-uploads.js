const fs = require('fs');
const path = require('path');

// Create upload directories if they don't exist
const directories = [
  'uploads',
  'uploads/action-plans',
  'uploads/audit-findings',
  'uploads/rectifications'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    console.log(`Directory already exists: ${dirPath}`);
  }
});

console.log('Upload directories setup complete!');