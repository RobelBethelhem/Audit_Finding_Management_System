// const isUser = (req, res, next) => {
//   console.log('Session:', req.session);
//   console.log('req.user:', req.user);
//   if (req.user && req.user.role === 'user') {
//       next();
//   } else {
//       res.status(401).json({ error: 'Unauthorized' });
//   }
// };

// const isAdmin = (req, res, next) => {
//   if (req.user && req.user.role === 'admin') {
//       next();
//   } else {
//       res.status(401).json({ error: 'Unauthorized' });
//   }
// };

// const isUserOrAdmin = (req, res, next) => {
//   if (req.user && (req.user.role === 'user' || req.user.role === 'admin')) {
//       next();
//   } else {
//       res.status(401).json({ error: 'Unauthorized' });
//   }
// };


// module.exports = {
//   isUser,
//   isAdmin,
//   isUserOrAdmin
// };