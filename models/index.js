// 'use strict';

// const fs = require('fs');
// const path = require('path');
// const Sequelize = require('sequelize');
// const basename = path.basename(__filename);
// const env = process.env.NODE_ENV || 'development';
// const config = require(__dirname + '/../config/database.js')[env];
// const db = {};

// let sequelize;
// if (config.use_env_variable) {
//   sequelize = new Sequelize(process.env[config.use_env_variable], config);
// } else {
//   sequelize = new Sequelize(config.database, config.username, config.password, config);
// }

// // First, load all models
// fs
//   .readdirSync(__dirname)
//   .filter(file => {
//     return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
//   })
//   .forEach(file => {
//     const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
//     db[model.name] = model;
//   });

// // Then, establish associations after all models are loaded
// Object.keys(db).forEach(modelName => {
//   if (db[modelName].associate && typeof db[modelName].associate === 'function') {
//     try {
//       db[modelName].associate(db);
//     } catch (error) {
//       console.error(`Error establishing associations for ${modelName}:`, error);
//     }
//   }
// });

// db.sequelize = sequelize;
// db.Sequelize = Sequelize;

// module.exports = db;


'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// First, load all models with error handling
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    try {
      const modelPath = path.join(__dirname, file);
      const modelModule = require(modelPath);
      
      // Check if the module exports a function
      if (typeof modelModule === 'function') {
        const model = modelModule(sequelize, Sequelize.DataTypes);
        if (model && model.name) {
          db[model.name] = model;
          console.log(`✓ Model loaded: ${model.name}`);
        } else {
          console.error(`✗ Model file ${file} did not return a valid model`);
        }
      } else {
        console.error(`✗ Model file ${file} does not export a function. Export type: ${typeof modelModule}`);
      }
    } catch (error) {
      console.error(`✗ Error loading model ${file}:`, error.message);
      // Log the full error in development
      if (env === 'development') {
        console.error('Full error:', error);
      }
    }
  });

console.log(`\nTotal models loaded: ${Object.keys(db).length}`);
console.log('Models:', Object.keys(db).join(', '));

// Then, establish associations after all models are loaded
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate && typeof db[modelName].associate === 'function') {
    try {
      db[modelName].associate(db);
      console.log(`✓ Associations established for ${modelName}`);
    } catch (error) {
      console.error(`✗ Error establishing associations for ${modelName}:`, error.message);
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

