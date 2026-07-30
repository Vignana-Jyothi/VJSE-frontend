const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function normalizeEmail(email) {
  if (!email) return '';
  const lower = email.toLowerCase().trim();
  if (lower.endsWith('@gmail.com')) {
    const parts = lower.split('@');
    const local = parts[0].replace(/\./g, '');
    return local + '@gmail.com';
  }
  return lower;
}

module.exports = function (prisma) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
        callbackURL: 'http://localhost:3000/auth/google/callback',
      },
      async function (accessToken, refreshToken, profile, done) {
        try {
          if (!profile.emails || profile.emails.length === 0) {
            return done(new Error('No email found in Google profile'), null);
          }

          const email = profile.emails[0].value;
          const normalized = normalizeEmail(email);

          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (user) {
            return done(null, user);
          }

          user = await prisma.user.findUnique({
            where: { email: normalized },
          });

          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
            console.log(`🔗 Linked Google authentication to existing user: ${user.email}`);
            return done(null, user);
          }

          let resolvedRole = 'Student';

          if (
            normalized === 'karnamsuhaas@gmail.com' ||
            normalized === 'suhaaskarnam@gmail.com' ||
            normalized === 'shubham202098@gmail.com' ||
            normalized === 'akshaynerella9@gmail.com' ||
            normalized === 'admin@vnrvjiet.in'
          ) {
            resolvedRole = 'Admin';
          } else if (normalized === 'founder@vnrvjiet.in') {
            resolvedRole = 'Founder';
          } else if (normalized.endsWith('@vnrvjiet.in')) {
            const prefix = normalized.split('@')[0];
            if (prefix.startsWith('volunteer')) {
              resolvedRole = 'Volunteer';
            } else {
              resolvedRole = 'Student';
            }
          }

          user = await prisma.user.create({
            data: {
              email: normalized,
              name: profile.displayName || 'VJ User',
              role: resolvedRole,
              googleId: profile.id,
            },
          });

          console.log(`🆕 Auto-registered new Google user: ${user.name} (${user.role})`);
          return done(null, user);
        } catch (error) {
          console.error('Error during Google authentication strategy:', error);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};