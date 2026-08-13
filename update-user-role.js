require('dotenv').config();
const Database = require('better-sqlite3');

class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.DB_ENCRYPTION_KEY || 'my-super-secret-password';
    this.pragma("cipher='sqlcipher'");
    this.pragma(`key='${key}'`);
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

async function updateRole() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'shubham202098@gmail.com';
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      const updated = await prisma.user.update({
        where: { email },
        data: { role: 'Mentor' }
      });
      console.log(`✅ User ${email} role updated to: ${updated.role}`);
    } else {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('VJSEeco@2026', 10);
      const created = await prisma.user.create({
        data: {
          name: 'Shubham',
          email,
          password: hashedPassword,
          role: 'Mentor'
        }
      });
      console.log(`✅ Created user ${email} with role: ${created.role}`);
    }
  } catch (err) {
    console.error('❌ Error updating user role:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateRole();
