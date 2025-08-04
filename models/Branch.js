const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  branch_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: {
      name: 'unique_branch_code',
      msg: 'Branch code must be unique'
    },
    validate: {
      notEmpty: {
        msg: 'Branch code is required'
      },
      len: {
        args: [2, 20],
        msg: 'Branch code must be between 2 and 20 characters'
      },
      isAlphanumeric: {
        msg: 'Branch code must contain only letters and numbers'
      }
    }
  },
  branch_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Branch name is required'
      },
      len: {
        args: [2, 100],
        msg: 'Branch name must be between 2 and 100 characters'
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'branches',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['branch_code']
    },
    {
      fields: ['is_active']
    }
  ],
  scopes: {
    active: {
      where: {
        is_active: true
      }
    }
  }
});

// Define associations
Branch.associate = function(models) {
  Branch.hasMany(models.User, {
    foreignKey: 'branch_id',
    as: 'users'
  });
};

// Instance methods
Branch.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Class methods
Branch.getActiveBranches = async function() {
  return await this.scope('active').findAll({
    order: [['branch_name', 'ASC']]
  });
};

Branch.findByCode = async function(branchCode) {
  return await this.findOne({
    where: {
      branch_code: branchCode,
      is_active: true
    }
  });
};

return Branch;
};
