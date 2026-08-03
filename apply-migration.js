require('dotenv').config();
const path = require('path');
const fsMod = require('fs');
const Database = require('better-sqlite3');

// Replicate the same encryption setup used in server.js
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.DB_ENCRYPTION_KEY || 'my-super-secret-password';
    this.pragma("cipher='sqlcipher'");
    this.pragma("key='" + key + "'");
    this.pragma('journal_mode=WAL');
    this.pragma('busy_timeout=5000');
  }
}
const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const db = new EncryptedDatabase(path.resolve(__dirname, 'dev.db'));
const migrationName = '20260803112037_add_rejection_tracking_and_invite_token';
const migrationSql = fsMod.readFileSync(
  path.resolve(__dirname, 'prisma/migrations/' + migrationName + '/migration.sql'),
  'utf8'
);

console.log('Applying migration: ' + migrationName + '\n');

// Run ALTER TABLE statements individually
const alterStatements = [
  { sql: 'ALTER TABLE "User" ADD COLUMN "rejectionCount" INTEGER NOT NULL DEFAULT 0', desc: 'Add User.rejectionCount' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false',  desc: 'Add User.isBlocked' },
  { sql: 'ALTER TABLE "Lead" ADD COLUMN "inviteToken" TEXT',                           desc: 'Add Lead.inviteToken' },
  { sql: 'ALTER TABLE "Lead" ADD COLUMN "inviteAccepted" BOOLEAN NOT NULL DEFAULT false', desc: 'Add Lead.inviteAccepted' },
];

let ok = 0;
for (const { sql, desc } of alterStatements) {
  try {
    db.prepare(sql).run();
    console.log('[OK]   ' + desc);
    ok++;
  } catch (e) {
    if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
      console.log('[SKIP] ' + desc + ' (already applied)');
    } else {
      console.error('[ERR]  ' + desc + ': ' + e.message);
      db.close();
      process.exit(1);
    }
  }
}

// Run CREATE TABLE via exec (handles multi-line + embedded semicolons in constraints)
const createSql = [
  'CREATE TABLE "SourcerRejectionLog" (',
  '    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,',
  '    "sourcerId" INTEGER NOT NULL,',
  '    "leadId" INTEGER NOT NULL,',
  '    "connectionId" INTEGER NOT NULL,',
  '    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '    CONSTRAINT "SourcerRejectionLog_sourcerId_fkey" FOREIGN KEY ("sourcerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,',
  '    CONSTRAINT "SourcerRejectionLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,',
  '    CONSTRAINT "SourcerRejectionLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectionRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  ')',
].join('\n');

try {
  db.exec(createSql);
  console.log('[OK]   Create SourcerRejectionLog table');
  ok++;
} catch (e) {
  if (e.message.includes('already exists')) {
    console.log('[SKIP] SourcerRejectionLog table (already exists)');
  } else {
    console.error('[ERR]  Create SourcerRejectionLog: ' + e.message);
    db.close();
    process.exit(1);
  }
}

// --- Verification ---
console.log('\n--- Verification ---');
const uCols = db.pragma('table_info("User")').map(function(c) { return c.name; });
console.log('User.rejectionCount exists :', uCols.includes('rejectionCount'));
console.log('User.isBlocked exists      :', uCols.includes('isBlocked'));

const lCols = db.pragma('table_info("Lead")').map(function(c) { return c.name; });
console.log('Lead.inviteToken exists    :', lCols.includes('inviteToken'));
console.log('Lead.inviteAccepted exists :', lCols.includes('inviteAccepted'));

const tbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SourcerRejectionLog'").get();
console.log('SourcerRejectionLog table  :', !!tbl);

// Record in _prisma_migrations table so Prisma knows it's applied
try {
  const migTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
  if (migTable) {
    const already = db.prepare('SELECT id FROM _prisma_migrations WHERE migration_name = ?').get(migrationName);
    if (!already) {
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(migrationSql).digest('hex');
      const now = new Date().toISOString();
      db.prepare('INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (?,?,?,?,?,?,?,?)').run(
        crypto.randomUUID(), checksum, now, migrationName, null, null, now, 1
      );
      console.log('\nMigration recorded in _prisma_migrations.');
    } else {
      console.log('\nAlready recorded in _prisma_migrations.');
    }
  }
} catch (e) {
  console.log('\nNote (_prisma_migrations):', e.message);
}

db.close();
console.log('\nMigration applied successfully! (' + ok + ' new statement(s) executed)');
