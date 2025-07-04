const express = require('express');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const levelRoutes = require('./routes/levelRoutes');
const withdrawInfoRoutes = require('./routes/withdrawInfoRoutes');
const paymentInfoRoutes = require('./routes/paymentInfoRoutes');
const unlockExpiredAccounts = require('./unLockCronJob');
const verifyDepositRoutes = require('./routes/verifyDepositRoutes');
const paidChildrenLimitRoutes = require('./routes/paidChildrenLimitRoutes');
const userBalanceRoutes = require('./routes/userBalanceRoutes');
const cashWithdrawRoutes = require('./routes/cashWithdrawRoutes');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const cors = require('cors'); 
const passportConfig = require('./passportConfiguration');

const dailyTaskConfigurationRoutes = require('./routes/dailyTaskConfigurationRoutes');
const dailyTaskGameRoutes = require('./routes/dailyTaskGameRoutes');
const dailyTaskPointRoutes = require('./routes/dailyTaskPointRoutes');
const userTaskSubmissionRoutes = require('./routes/userTaskSubmissionRoutes');
const p2pTradingRoutes = require('./routes/p2pTradingRoutes');
const bankAccountConfigurationRoutes = require('./routes/bankAccountConfigurationRoutes');
const amountRangeConfigurationRoutes = require('./routes/amountRangeConfigurationRoutes');
const glAccountRoutes = require('./routes/glAccountRoutes');
const glTransactionRoutes = require('./routes/glTransactionRoutes')
const categoryForInvestingRoutes = require('./routes/categoryForInvestingRoutes')

// Import expire games cron job
const expireAllGames = require('./expireGamesCronJob');


// const cashWithdrawHistoryRoutes = require('./routes/cashWithdrawHistoryRoutes');


dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;



// Middleware
   //passport configuration
passportConfig(passport);


// app.use(cors({
//   origin: 'http://localhost:4000', // Or your allowed origin
//   credentials: true,
// }));


app.use(cors({
  origin: ['http://192.168.137.1:4000', 'http://localhost:4000', 'http://192.168.137.1:3000', 'http://192.168.137.1:4500', 'http://localhost:4500'], 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());
app.use(session({ secret: 'first_commission_based_millionare_project_poweredBy_movacash',
   resave: false,
   saveUninitialized: true,
   cookie: {
    maxAge: 200 * 60 * 1000 
  }
   }));
app.use((req, res, next) => {
if (req.session && req.session.cookie && req.session.cookie.expires) {
  if (new Date() > new Date(req.session.cookie.expires)) {
    req.logout((err) => {
      if (err) return next(err);
      return res.status(401).json({ message: 'Session expired' });
    });
    return;
  }
}
next();
});
app.use(passport.initialize());
app.use(passport.session());



// Routes
app.use('/api/users', userRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/withdraw-info', withdrawInfoRoutes);
app.use('/api/payment-info', paymentInfoRoutes);
app.use('/api/verify-deposit', verifyDepositRoutes);
app.use('/api/paid-children-limit', paidChildrenLimitRoutes);
app.use('/api/user-balance', userBalanceRoutes);
app.use('/api/withdrawals', cashWithdrawRoutes);

app.use('/api/daily-task-configurations', dailyTaskConfigurationRoutes);
app.use('/api/daily-task-games', dailyTaskGameRoutes);
app.use('/api/daily-task-points', dailyTaskPointRoutes);
app.use('/api/user-tasks', userTaskSubmissionRoutes);
app.use('/api/p2p-trading', p2pTradingRoutes);
app.use('/api/bank-account-configurations', bankAccountConfigurationRoutes);
app.use('/api/amount-range-configurations', amountRangeConfigurationRoutes);
app.use('/api/glaccount', glAccountRoutes);
app.use('/api/gl-transaction', glTransactionRoutes);
app.use('/api/category-for-investing', categoryForInvestingRoutes)



// app.use('/api/cash-withdraw-history', cashWithdrawHistoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.sync();
    console.log('Database connected successfully');

    // Start cron job
    setInterval(unlockExpiredAccounts, 60 * 60 * 1000);
    console.log('Account unlock cron job started');

    // Start the game expiration cron job - runs at midnight every day
    const runGameExpirationJob = async () => {
      const now = new Date();
      // Create a date for today at 6:00 AM
      let next6AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
    
      // If it's already past 6:00 AM today, schedule for tomorrow
      if (now >= next6AM) {
        next6AM.setDate(next6AM.getDate() + 1);
      }
    
      const msUntil6AM = next6AM.getTime() - now.getTime();
      
      // Schedule expireAllGames to run at 6:00 AM
      setTimeout(async () => {
        await expireAllGames();
        // Then set an interval to run it every 24 hours at 6:00 AM
        setInterval(expireAllGames, 24 * 60 * 60 * 1000);
      }, msUntil6AM);
    };
    
    // Start scheduling the game expiration job
    runGameExpirationJob();
    console.log('Game expiration cron job scheduled');

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});