'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('active_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE'
      },
      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      device_info: {
        type: Sequelize.STRING,
        allowNull: true
      },
      last_activity: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
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
    await queryInterface.addIndex('active_sessions', ['user_id'], {
      unique: true,
      name: 'user_id_unique_idx'
    });

    await queryInterface.addIndex('active_sessions', ['token_hash'], {
      unique: true,
      name: 'token_hash_unique_idx'
    });

    await queryInterface.addIndex('active_sessions', ['expires_at'], {
      name: 'expires_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('active_sessions');
  }
};