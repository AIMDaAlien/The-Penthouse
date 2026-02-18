const path = require('path');
const fs = require('fs');
const BetterSqlite3 = require('better-sqlite3');

// Keep sql.js only for one-time conversion from the legacy snapshot DB.
const initSqlJs = require('sql.js');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');

// Legacy sql.js snapshot DB (in-memory export persisted to a file)
const legacyDbPath = path.join(dataDir, 'penthouse.db');
// Durable SQLite DB (file-backed)
const sqlitePath = path.join(dataDir, 'penthouse.sqlite');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let db = null;
let signalsRegistered = false;

// Export a stable proxy object so modules can `const { db } = require('../database')`
// without capturing a null value before initializeDatabase() runs.
const dbProxy = {
  prepare: (sql) => {
    if (!db) throw new Error('Database not initialized');
    return db.prepare(sql);
  },
  exec: (sql) => {
    if (!db) throw new Error('Database not initialized');
    return db.exec(sql);
  },
  pragma: (value) => {
    if (!db) throw new Error('Database not initialized');
    return db.pragma(value);
  },
  transaction: (fn) => {
    if (!db) throw new Error('Database not initialized');
    return db.transaction(fn);
  }
};

function sqlJsGetAll(sqlJsDb, sql, params = []) {
  const stmt = sqlJsDb.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  const columns = stmt.getColumnNames();

  while (stmt.step()) {
    const values = stmt.get();
    const obj = {};
    columns.forEach((col, i) => { obj[col] = values[i]; });
    results.push(obj);
  }

  stmt.free();
  return results;
}

function convertLegacySqlJsToSqlite(sqlJsDb, sqliteDb) {
  // Copy table rows (schema and indexes are created by the normal migrations below).
  const legacyTables = sqlJsGetAll(
    sqlJsDb,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).map(r => r.name);

  const tx = sqliteDb.transaction(() => {
    for (const table of legacyTables) {
      if (!table || table.startsWith('sqlite_')) continue;

      const legacyCols = sqlJsGetAll(sqlJsDb, `PRAGMA table_info(${table})`).map(r => r.name);
      const newCols = sqliteDb.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
      if (newCols.length === 0) continue;

      const commonCols = legacyCols.filter(c => newCols.includes(c));
      if (commonCols.length === 0) continue;

      const rows = sqlJsGetAll(sqlJsDb, `SELECT ${commonCols.join(',')} FROM ${table}`);
      if (rows.length === 0) continue;

      const placeholders = commonCols.map(() => '?').join(',');
      const insert = sqliteDb.prepare(`INSERT INTO ${table} (${commonCols.join(',')}) VALUES (${placeholders})`);
      for (const row of rows) {
        insert.run(...commonCols.map(c => row[c]));
      }
    }
  });

  tx();
}

function applySchemaMigrations(sqliteDb) {
  // Enable foreign keys
  sqliteDb.pragma('foreign_keys = ON');

  // Users table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add email column if it doesn't exist
  try {
    sqliteDb.exec('ALTER TABLE users ADD COLUMN email TEXT');
  } catch (e) {
    if (!String(e.message || '').includes('duplicate column')) console.error('Migration error (email):', e.message);
  }

  // Servers (Communities)
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon_url TEXT,
      owner_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Server Members
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS server_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id, user_id)
    )
  `);

  // Chats (can be DMs, Group DMs, or Server Channels)
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT DEFAULT 'dm',
      server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat Members
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS chat_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      nickname TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chat_id, user_id)
    )
  `);

  // Messages
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      content TEXT,
      message_type TEXT DEFAULT 'text',
      metadata TEXT,
      reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME DEFAULT NULL,
      deleted_at DATETIME DEFAULT NULL
    )
  `);

  // Migration: Add edited_at and deleted_at columns if they don't exist
  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN edited_at DATETIME DEFAULT NULL');
  } catch (e) {
    if (!String(e.message || '').includes('duplicate column')) console.error('Migration error (edited_at):', e.message);
  }

  try {
    sqliteDb.exec('ALTER TABLE messages ADD COLUMN deleted_at DATETIME DEFAULT NULL');
  } catch (e) {
    if (!String(e.message || '').includes('duplicate column')) console.error('Migration error (deleted_at):', e.message);
  }

  // Reactions table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, emoji)
    )
  `);

  // Read receipts table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS read_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    )
  `);

  // Friend requests table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Friendships table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    )
  `);

  // Server invites table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS server_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER REFERENCES users(id),
      max_uses INTEGER DEFAULT NULL,
      uses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pinned messages table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS pinned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      pinned_by INTEGER REFERENCES users(id),
      pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id)
    )
  `);

  // Push tokens table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      device_type TEXT DEFAULT 'unknown',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, token)
    )
  `);

  // Password reset tokens table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      token_hash TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Emotes table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS emotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      image_url TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Blocked Users table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id)
    )
  `);

  // Refresh Tokens
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      token_hash TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add created_at to blocked_users if missing
  try {
    sqliteDb.exec('ALTER TABLE blocked_users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  } catch (e) {
    if (String(e.message || '').includes('non-constant default')) {
      try {
        sqliteDb.exec('ALTER TABLE blocked_users ADD COLUMN created_at DATETIME');
        sqliteDb.exec('UPDATE blocked_users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
      } catch (innerErr) {
        if (!String(innerErr.message || '').includes('duplicate column')) {
          console.error('Migration error (blocked_users.created_at fallback):', innerErr.message);
        }
      }
    } else if (!String(e.message || '').includes('duplicate column')) {
      console.error('Migration error (blocked_users.created_at):', e.message);
    }
  }

  // Migration: add token_hash to refresh_tokens if missing
  try {
    sqliteDb.exec('ALTER TABLE refresh_tokens ADD COLUMN token_hash TEXT');
  } catch (e) {
    if (!String(e.message || '').includes('duplicate column')) console.error('Migration error (refresh_tokens.token_hash):', e.message);
  }

  // Migration: add token_hash to password_resets if missing
  try {
    sqliteDb.exec('ALTER TABLE password_resets ADD COLUMN token_hash TEXT');
  } catch (e) {
    if (!String(e.message || '').includes('duplicate column')) console.error('Migration error (password_resets.token_hash):', e.message);
  }

  // Performance indexes
  sqliteDb.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_messages_chat_id_desc ON messages(chat_id, id DESC)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_server_members_user ON server_members(user_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON read_receipts(message_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_chats_server_type_created ON chats(server_id, type, created_at)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status ON friend_requests(receiver_id, status, created_at DESC)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status ON friend_requests(sender_id, status, created_at DESC)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_password_resets_expiry ON password_resets(expires_at)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash)');
}

async function initializeDatabase() {
  const isTest = process.env.NODE_ENV === 'test';
  const needsLegacyConversion = !isTest && fs.existsSync(legacyDbPath) && !fs.existsSync(sqlitePath);

  const openSqlite = (dbFile) => {
    const sqliteDb = new BetterSqlite3(dbFile);
    // Durability and concurrency tuning.
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.pragma('busy_timeout = 5000');
    if (!isTest) {
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('synchronous = FULL');
    }
    applySchemaMigrations(sqliteDb);
    return sqliteDb;
  };

  // One-time conversion from legacy sql.js DB if present.
  if (needsLegacyConversion) {
    const tmpPath = `${sqlitePath}.tmp`;
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    console.log('Legacy sql.js database detected; converting to durable SQLite...');
    try {
      const sqliteTmp = openSqlite(tmpPath);
      sqliteTmp.pragma('foreign_keys = OFF'); // order-independent import

      const SQL = await initSqlJs();
      const legacyBuffer = fs.readFileSync(legacyDbPath);
      const legacyDb = new SQL.Database(legacyBuffer);
      legacyDb.run('PRAGMA foreign_keys = ON');

      sqliteTmp.exec('BEGIN IMMEDIATE');
      try {
        convertLegacySqlJsToSqlite(legacyDb, sqliteTmp);
        sqliteTmp.exec('COMMIT');
      } catch (err) {
        try { sqliteTmp.exec('ROLLBACK'); } catch (_) {}
        throw err;
      } finally {
        try { legacyDb.close(); } catch (_) {}
      }

      sqliteTmp.pragma('foreign_keys = ON');
      try {
        const fkIssues = sqliteTmp.prepare('PRAGMA foreign_key_check').all();
        if (fkIssues.length > 0) {
          console.error('Foreign key issues detected after import:', fkIssues.slice(0, 10));
        }
      } catch (_) {
        // ignore
      }

      sqliteTmp.close();
      fs.renameSync(tmpPath, sqlitePath);
      console.log('Legacy database conversion complete.');
    } catch (err) {
      // Leave legacy DB untouched; remove temp/new sqlite files if created.
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      try { fs.unlinkSync(sqlitePath); } catch (_) {}
      console.error('Legacy database conversion failed:', err && err.message ? err.message : err);
      throw err;
    }
  }

  const sqliteDb = openSqlite(isTest ? ':memory:' : sqlitePath);
  db = sqliteDb;
  console.log('📦 Database initialized');

  // Handle graceful shutdown
  const handleExit = () => {
    console.log('Hyperspace closing... closing database...');
    try { sqliteDb.close(); } catch (_) {}
    process.exit(0);
  };
  if (!signalsRegistered) {
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    signalsRegistered = true;
  }
}

function getDb() {
  return dbProxy;
}

module.exports = {
  db: getDb(),
  initializeDatabase
};
