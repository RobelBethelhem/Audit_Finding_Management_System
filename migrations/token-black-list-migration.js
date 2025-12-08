'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('token_blacklist', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      token: {
        type: Sequelize.STRING(1000),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    const dialect = queryInterface.sequelize.getDialect();
    
    // For MySQL/MariaDB, use a prefix index for the token field
    if (dialect === 'mysql' || dialect === 'mariadb') {
      // Create unique index with prefix length for MySQL
      await queryInterface.sequelize.query(
        'ALTER TABLE `token_blacklist` ADD UNIQUE INDEX `token_unique_idx` (`token`(255))'
      );
    } else {
      // For PostgreSQL and other databases
      await queryInterface.addIndex('token_blacklist', {
        fields: ['token'],
        unique: true,
        name: 'token_unique_idx'
      });
    }

    // Add other indexes
    await queryInterface.addIndex('token_blacklist', {
      fields: ['user_id'],
      name: 'user_id_idx'
    });

    await queryInterface.addIndex('token_blacklist', {
      fields: ['expires_at'],
      name: 'expires_at_idx'
    });

    // Composite index for faster lookups
    await queryInterface.addIndex('token_blacklist', {
      fields: ['user_id', 'expires_at'],
      name: 'user_expires_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    try {
      await queryInterface.removeIndex('token_blacklist', 'token_unique_idx');
    } catch (error) {
      console.log('Index token_unique_idx might not exist');
    }

    try {
      await queryInterface.removeIndex('token_blacklist', 'user_id_idx');
    } catch (error) {
      console.log('Index user_id_idx might not exist');
    }

    try {
      await queryInterface.removeIndex('token_blacklist', 'expires_at_idx');
    } catch (error) {
      console.log('Index expires_at_idx might not exist');
    }

    try {
      await queryInterface.removeIndex('token_blacklist', 'user_expires_idx');
    } catch (error) {
      console.log('Index user_expires_idx might not exist');
    }

    // Drop the table
    await queryInterface.dropTable('token_blacklist');
  }
};
