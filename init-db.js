require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');

const dbFile = 'dev.db';

// Delete the old unencrypted file so we can recreate it encrypted
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('🗑️ Deleted old unencrypted dev.db');
}

const dbKey = process.env.DB_ENCRYPTION_KEY || 'my-super-secret-password';
const db = new Database(dbFile);
db.pragma("cipher='sqlcipher'");
db.pragma(`key='${dbKey}'`);

const schema = fs.readFileSync('schema.sql', 'utf8');
db.exec(schema);

console.log('✅ Created NEW encrypted dev.db and applied Prisma schema.');
db.close();
