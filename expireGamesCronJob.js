const { DailyTaskGame } = require('./models');

// Function to expire all active games
async function expireAllGames() {
  try {
    console.log('Running cron job to expire active games');
    
    const result = await DailyTaskGame.update(
      { isExpired: true },
      { where: { isExpired: false } }
    );
    
    console.log(`Expired ${result[0]} active games`);
    
    return result[0]; // Return the number of expired games
  } catch (error) {
    console.error('Error in expire games cron job:', error);
    return 0;
  }
}

module.exports = expireAllGames;