require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.DB_ENCRYPTION_KEY;
    if (!key) throw new Error('FATAL: DB_ENCRYPTION_KEY is required');
    this.pragma("cipher='sqlcipher'");
    this.pragma("key='" + key + "'");
    this.pragma('journal_mode=WAL');
    this.pragma('busy_timeout=5000');
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const db = new EncryptedDatabase(path.resolve(__dirname, 'dev.db'));

const statements = [
  { sql: 'ALTER TABLE "User" ADD COLUMN "phone" TEXT', desc: 'Add User.phone' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "year" TEXT', desc: 'Add User.year' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "branch" TEXT', desc: 'Add User.branch' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false', desc: 'Add User.profileCompleted' },
  { sql: 'ALTER TABLE "Lead" ADD COLUMN "approvedByVolunteerId" INTEGER', desc: 'Add Lead.approvedByVolunteerId' },
  { sql: 'ALTER TABLE "Lead" ADD COLUMN "approvedAt" DATETIME', desc: 'Add Lead.approvedAt' },
  { sql: 'ALTER TABLE "ConnectionRequest" ADD COLUMN "sourcerResponse" TEXT', desc: 'Add ConnectionRequest.sourcerResponse' },
  { sql: 'ALTER TABLE "ConnectionRequest" ADD COLUMN "sourcerRespondedAt" DATETIME', desc: 'Add ConnectionRequest.sourcerRespondedAt' },
  { sql: 'ALTER TABLE "ConnectionRequest" ADD COLUMN "mentorNotifiedAt" DATETIME', desc: 'Add ConnectionRequest.mentorNotifiedAt' },
  { sql: 'ALTER TABLE "ConnectionRequest" ADD COLUMN "sourcerInviteToken" TEXT', desc: 'Add ConnectionRequest.sourcerInviteToken' },
];

let ok = 0;
for (const { sql, desc } of statements) {
  try {
    db.prepare(sql).run();
    console.log('[OK]   ' + desc);
    ok++;
  } catch (err) {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      console.log('[SKIP] ' + desc);
    } else {
      console.error('[ERR]  ' + desc + ': ' + err.message);
      db.close();
      process.exit(1);
    }
  }
}

db.close();
console.log('\nDone! ' + ok + ' statements executed.');
