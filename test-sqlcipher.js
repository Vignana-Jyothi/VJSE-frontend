/**
 * SQLCipher Encryption Verification Test
 * 
 * This script proves that better-sqlite3-multiple-ciphers can:
 *   1. Create an encrypted database with SQLCipher
 *   2. Write and read data through the encrypted connection
 *   3. Reject access when opened without the correct key (proving real encryption)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const TEST_DB = path.join(__dirname, 'test-encrypted.db');
const TEST_KEY = 'test-verification-key-2026';

// Clean up any previous test file
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
  console.log('🧹 Cleaned up previous test DB');
}

// ──────────────────────────────────────────────
// PHASE 1: Create encrypted DB, write data
// ──────────────────────────────────────────────
console.log('\n═══ PHASE 1: Create encrypted database ═══');
const db1 = new Database(TEST_DB);
db1.pragma("cipher='sqlcipher'");
db1.pragma(`key='${TEST_KEY}'`);

// Enable WAL mode for concurrency (also verifying pragma works post-key)
const walResult = db1.pragma('journal_mode=WAL');
console.log('  journal_mode =', walResult);

db1.exec(`
  CREATE TABLE test_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );
`);
console.log('  ✅ Created test_users table');

db1.prepare('INSERT INTO test_users (name, email) VALUES (?, ?)').run('Rohan Kumar', 'rohan@vnrvjiet.in');
db1.prepare('INSERT INTO test_users (name, email) VALUES (?, ?)').run('Kabir Mehta', 'kabir@vnrvjiet.in');
console.log('  ✅ Inserted 2 rows');

const rows = db1.prepare('SELECT * FROM test_users').all();
console.log('  ✅ Read back:', JSON.stringify(rows));

db1.close();
console.log('  ✅ Database closed');

// ──────────────────────────────────────────────
// PHASE 2: Reopen WITH correct key — should work
// ──────────────────────────────────────────────
console.log('\n═══ PHASE 2: Reopen with correct key ═══');
const db2 = new Database(TEST_DB);
db2.pragma("cipher='sqlcipher'");
db2.pragma(`key='${TEST_KEY}'`);

const rows2 = db2.prepare('SELECT * FROM test_users').all();
console.log('  ✅ Read back after reopen:', JSON.stringify(rows2));
db2.close();

// ──────────────────────────────────────────────
// PHASE 3: Reopen WITHOUT key — MUST fail
// ──────────────────────────────────────────────
console.log('\n═══ PHASE 3: Attempt access WITHOUT encryption key ═══');
try {
  const db3 = new Database(TEST_DB);
  // Do NOT set cipher or key — try reading directly
  const rows3 = db3.prepare('SELECT * FROM test_users').all();
  console.log('  ❌ FAIL: Data was readable without key! Encryption is NOT working.');
  console.log('     Got:', JSON.stringify(rows3));
  db3.close();
  process.exit(1);
} catch (err) {
  console.log('  ✅ PASS: Access denied without key (expected)');
  console.log('     Error:', err.message);
}

// ──────────────────────────────────────────────
// PHASE 4: Reopen with WRONG key — MUST fail
// ──────────────────────────────────────────────
console.log('\n═══ PHASE 4: Attempt access with WRONG key ═══');
try {
  const db4 = new Database(TEST_DB);
  db4.pragma("cipher='sqlcipher'");
  db4.pragma("key='completely-wrong-password'");
  const rows4 = db4.prepare('SELECT * FROM test_users').all();
  console.log('  ❌ FAIL: Data was readable with wrong key! Encryption is NOT working.');
  console.log('     Got:', JSON.stringify(rows4));
  db4.close();
  process.exit(1);
} catch (err) {
  console.log('  ✅ PASS: Access denied with wrong key (expected)');
  console.log('     Error:', err.message);
}

// ──────────────────────────────────────────────
// Cleanup
// ──────────────────────────────────────────────
console.log('\n═══ CLEANUP ═══');
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
  console.log('  🧹 Removed test-encrypted.db');
}
// Also remove WAL/SHM sidecar files if present
for (const ext of ['-wal', '-shm']) {
  const p = TEST_DB + ext;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log('\n🎉 ALL TESTS PASSED — SQLCipher encryption is fully functional on this machine.');
