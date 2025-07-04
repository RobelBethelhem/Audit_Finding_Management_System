const { P2PPoints } = require('./models');
const { Op } = require('sequelize'); 


async function expireP2PSell() {
  try {
    console.log('Running cron job to expire active P2P sell');

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const result = await P2PPoints.update(
      { status: 'Rejected' },
      {
        where: {
          status: 'Pending',
          createdAt: {
            [Op.lt]: today 
          }
        }
      }
    );

    return result[0];
  } catch (error) {
    console.error('Error in expire P2P sell cron job:', error);
    return 0;
  }
}

module.exports = expireP2PSell;