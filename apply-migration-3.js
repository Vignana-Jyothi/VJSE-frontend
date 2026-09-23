require('dotenv').config();
const path = require('path');
const fsMod = require('fs');
const Database = require('better-sqlite3-multiple-ciphers');

class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.DB_ENCRYPTION_KEY || process.env.SQLCIPHER_KEY || 'my-super-secret-password';
    this.pragma("key='" + key + "'");
    this.pragma("cipher='sqlcipher'");
    this.pragma('journal_mode=WAL');
    this.pragma('busy_timeout=5000');
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const db = new EncryptedDatabase(path.resolve(__dirname, 'dev.db'));

console.log('Applying migration 3...\n');

const statements = [
  { sql: 'ALTER TABLE "User" ADD COLUMN "designation" TEXT', desc: 'Add User.designation' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "experience" TEXT', desc: 'Add User.experience' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "linkedIn" TEXT', desc: 'Add User.linkedIn' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "bio" TEXT', desc: 'Add User.bio' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "hasSeenWelcome" BOOLEAN NOT NULL DEFAULT false', desc: 'Add User.hasSeenWelcome' },
  { sql: 'ALTER TABLE "User" ADD COLUMN "hasLinkedAccount" BOOLEAN NOT NULL DEFAULT false', desc: 'Add User.hasLinkedAccount' },
  { sql: 'ALTER TABLE "Lead" ADD COLUMN "mentorUserId" INTEGER', desc: 'Add Lead.mentorUserId' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "tagline" TEXT', desc: 'Add StartupProfile.tagline' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "problemStatement" TEXT', desc: 'Add StartupProfile.problemStatement' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "solution" TEXT', desc: 'Add StartupProfile.solution' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "teamSize" TEXT', desc: 'Add StartupProfile.teamSize' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "helpNeeded" TEXT', desc: 'Add StartupProfile.helpNeeded' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "website" TEXT', desc: 'Add StartupProfile.website' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "demoLink" TEXT', desc: 'Add StartupProfile.demoLink' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "achievement" TEXT', desc: 'Add StartupProfile.achievement' },
  { sql: 'ALTER TABLE "StartupProfile" ADD COLUMN "trlLevel" TEXT', desc: 'Add StartupProfile.trlLevel' },
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
    }
  }
}

const createSql = [
  'CREATE TABLE IF NOT EXISTS "LoginLog" (',
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
  }
}

db.close();
console.log('\nMigration 3 applied successfully!');
