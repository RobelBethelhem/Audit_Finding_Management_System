const { User, AccountLockHistory, sequelize } = require('./models');
const { Op } = require('sequelize');

async function unlockExpiredAccounts() {
  const transaction = await sequelize.transaction();
  try {
    // Find locked users with expired lockout
    const lockedUsers = await User.findAll({
      where: {
        lockout_until: { [Op.lte]: new Date() },
        status: 'LockeOut'
      },
      include: [
        {
          model: AccountLockHistory,
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      ],
      transaction
    });

    for (const user of lockedUsers) {
      const previousStatus = user.AccountLockHistories[0]?.previous_status || 'Inactive';
      
      await user.update({
        status: previousStatus,
        failed_attempts: 0,
        lockout_until: null
      }, { transaction });

      await AccountLockHistory.destroy({
        where: { user_id: user.id },
        transaction
      });
    }

    await transaction.commit();
    console.log(`Unlocked ${lockedUsers.length} accounts`);

  } catch (error) {
    await transaction.rollback();
    console.error('Error unlocking accounts:', error);
  }
}

module.exports = unlockExpiredAccounts;