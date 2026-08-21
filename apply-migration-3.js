require('dotenv').config();
const path = require('path');
const fsMod = require('fs');
const Database = require('better-sqlite3');

class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.DB_ENCRYPTION_KEY || process.env.SQLCIPHER_KEY || 'my-super-secret-password';
    this.pragma("cipher='sqlcipher'");
    this.pragma("key='" + key + "'");
    this.pragma('journal_mode=WAL');
    this.pragma('busy_timeout=5000');
  }
}
const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const db = new EncryptedDatabase(path.resolve(__dirname, 'dev.db'));

console.log('Applying migration: add_login_log\n');

const createSql = [
  'CREATE TABLE "LoginLog" (',
  '    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,',
  '    "userId" INTEGER NOT NULL,',
  '    "ipAddress" TEXT,',
  '    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,',
  '    CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE',
  ')',
].join('\n');

try {
  db.exec(createSql);
  console.log('[OK]   Create LoginLog table');
} catch (e) {
  if (e.message.includes('already exists')) {
    console.log('[SKIP] LoginLog table (already exists)');
  } else {
    console.error('[ERR]  Create LoginLog: ' + e.message);
    db.close();
    process.exit(1);
  }
}

console.log('\n--- Verification ---');
const tbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='LoginLog'").get();
console.log('LoginLog table exists:', !!tbl);

db.close();
console.log('\nMigration applied successfully!');
