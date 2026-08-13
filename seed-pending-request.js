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

async function seedRequest() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    const mentorLead = await prisma.lead.findFirst({ where: { email: 'shubham202098@gmail.com' } });
    const founder = await prisma.user.findFirst({ where: { role: 'Founder' } });

    if (mentorLead && founder) {
      const conn = await prisma.connectionRequest.upsert({
        where: { userId_leadId: { userId: founder.id, leadId: mentorLead.id } },
        update: { status: 'Pending' },
        create: { userId: founder.id, leadId: mentorLead.id, status: 'Pending' }
      });
      console.log('✅ Created pending connection request:', conn);
    } else {
      console.log('Mentor lead or founder not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

seedRequest();
