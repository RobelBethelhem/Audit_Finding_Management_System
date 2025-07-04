const LocalStrategy = require('passport-local').Strategy;
const { User, AdminUser, sequelize } = require('./models');
const bcrypt = require('bcrypt');
const { Op, literal } = require('sequelize');

module.exports = function (passport) {

    passport.use('local-user', new LocalStrategy(
        async (username, password, done) => {
          try {
            // const user = await User.findOne(
            //     { 
            //         where: { 
            //             username , status: {
            //             [Op.not]: 'LockeOut'
            //           }} 
            //     });

            const user = await User.findOne({
                where: {
                  [Op.and]: [
                    literal('BINARY username = :username'),
                    {
                      status: {
                        [Op.not]: 'LockeOut'
                      }
                    }
                  ]
                },
                replacements: {
                  username: username
                }
              });

            if (!user) {
              return done(null, false, { message: 'User not found or Account Locked' });
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
              return done(null, false, { message: 'Invalid password' });
            }
            // Add the role property here
            user.role = 'user';
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      ));

    // Strategy for admins
    passport.use('local-admin', new LocalStrategy(
        async (username, password, done) => {
        try {
            const adminUser = await AdminUser.findOne({ where: { username } });
            if (!adminUser){
                return done(null, false, { message: 'Admin not found' });
            } 
            const isPasswordValid = await bcrypt.compare(password, adminUser.password);
            if (!isPasswordValid){
                return done(null, false, { message: 'Invalid password' });                return done(null, false, { message: 'Invalid password' });
            } 
            adminUser.role = 'admin';
            return done(null, adminUser);
        } catch (error) {
            return done(error);
        }
    }));

    // Serialize user into session
    passport.serializeUser((user, done) => {
        // const role = user instanceof AdminUser ? 'admin' : 'user';
        // done(null, { id: user.id, role });
        console.log('Serializing user:', { id: user.id, role: user.role });
        done(null, { id: user.id, role: user.role });
    });

    // Deserialize user from session
    // passport.deserializeUser(async (data, done) => {
    //     try {
    //         if (data.role === 'admin') {
    //             const adminUser = await AdminUser.findByPk(data.id);
    //             return done(null, adminUser);
    //         } else {
    //             const user = await User.findByPk(data.id);
    //             return done(null, user);
    //         }
    //     } catch (error) {
    //         return done(error);
    //     }
    // });


    passport.deserializeUser(async (data, done) => {
        console.log('Deserializing:', data);
        try {
            if (data.role === 'user') {
                const user = await User.findByPk(data.id);
                console.log('User:', user ? user.id : 'not found');
                if (user) {
                    user.role = 'user';
                    return done(null, user);
                }
            } else if (data.role === 'admin') {
                const adminUser = await AdminUser.findByPk(data.id);
                console.log('Admin:', adminUser ? adminUser.id : 'not found');
                if (adminUser) {
                    adminUser.role = 'admin';
                    return done(null, adminUser);
                }
            }
            return done(null, false);
        } catch (error) {
            console.log('Deserialize error:', error);
            return done(error);
        }
    });
};