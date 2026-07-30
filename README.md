# VJ Startups Ecosystem (VJSE) Backend

## Local Development & Security

This project uses an encrypted SQLite database via SQLCipher (`better-sqlite3-multiple-ciphers`) to protect locally stored data.

> **CRITICAL WARNING:**
> Never commit your real `DB_ENCRYPTION_KEY` to version control. Always store it securely in your local `.env` file. Do not share the `.env` file!

### Setup instructions:
1. Copy `.env.example` to `.env`
2. Generate a secure, random string and set it as your `DB_ENCRYPTION_KEY`
3. Run `node init-db.js` to create the initial encrypted database file with the Prisma schema.
4. Run `node seed-users.js` to seed initial users into the database.
5. Run `npm start` (or `npm run dev` to start both frontend and backend).

### Bypassing Native Build Errors
If you face native C++ module build errors for SQLite (often blocked by Windows Application Control policies), the backend includes a pure-JS in-memory mock client. You can fall back to this by setting:
`USE_REAL_DB=false` in your `.env` file.
