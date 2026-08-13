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

async function addLead() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'shubham202098@gmail.com';
    const existing = await prisma.lead.findFirst({ where: { email } });

    if (!existing) {
      const created = await prisma.lead.create({
        data: {
          name: 'Shubham',
          email: email,
          domain: 'Tech / AI',
          organization: 'VJ Network',
          skills: 'Advisory, Technical Mentorship',
          verified: true,
          status: 'Approved'
        }
      });
      console.log('✅ Created Lead record for:', created.email);
    } else {
      const updated = await prisma.lead.update({
        where: { id: existing.id },
        data: { verified: true, status: 'Approved' }
      });
      console.log('✅ Updated existing Lead record to Approved for:', updated.email);
    }
  } catch (err) {
    console.error('❌ Error adding lead:', err);
  } finally {
    await prisma.$disconnect();
  }
}

addLead();
