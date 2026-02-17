const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const dbPath = path.join(dataDir, 'penthouse.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let db = null;
let signalsRegistered = false;

async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  // Load existing database or create new one
  if (process.env.NODE_ENV !== 'test' && fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Users table
  db.run(`
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
    db.run('ALTER TABLE users ADD COLUMN email TEXT');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error (email):', e.message);
  }

  // Servers (Communities)
  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon_url TEXT,
      owner_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Server Members
  db.run(`
    CREATE TABLE IF NOT EXISTS server_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(server_id, user_id)
    )
  `);

  // Chats (can be DMs, Group DMs, or Server Channels)
  db.run(`
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
  db.run(`
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
  db.run(`
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
    db.run('ALTER TABLE messages ADD COLUMN edited_at DATETIME DEFAULT NULL');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error (edited_at):', e.message);
  }
  try {
    db.run('ALTER TABLE messages ADD COLUMN deleted_at DATETIME DEFAULT NULL');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error (deleted_at):', e.message);
  }
  try {
    db.run('ALTER TABLE messages ADD COLUMN reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error (reply_to):', e.message);
  }

  // Reactions (Instagram-style)
  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, emoji)
    )
  `);

  // Read Receipts
  db.run(`
    CREATE TABLE IF NOT EXISTS read_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    )
  `);

  // Pinned Messages
  db.run(`
    CREATE TABLE IF NOT EXISTS pinned_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
      pinned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chat_id, message_id)
    )
  `);

  // Server Invites
  db.run(`
    CREATE TABLE IF NOT EXISTS server_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      uses INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT NULL
    )
  `);

  // Custom emotes
  db.run(`
    CREATE TABLE IF NOT EXISTS emotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      image_url TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Push notification tokens
  db.run(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      device_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, token)
    )
  `);

  // Password Resets
  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      token_hash TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Friend requests (pending)
  db.run(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sender_id, receiver_id)
    )
  `);

  // Friendships (accepted friend requests)
  db.run(`
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    )
  `);

  // Blocked users
  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_id)
    )
  `);

  // Refresh Tokens (Security Hardening)
  db.run(`
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
    db.run('ALTER TABLE blocked_users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  } catch (e) {
    if (e.message.includes('non-constant default')) {
      try {
        db.run('ALTER TABLE blocked_users ADD COLUMN created_at DATETIME');
        db.run('UPDATE blocked_users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
      } catch (innerErr) {
        if (!innerErr.message.includes('duplicate column')) {
          console.error('Migration error (blocked_users.created_at fallback):', innerErr.message);
        }
      }
    } else if (!e.message.includes('duplicate column')) {
      console.error('Migration error (blocked_users.created_at):', e.message);
    }
  }

  // Migration: add token_hash to refresh_tokens if missing
  try {
    db.run('ALTER TABLE refresh_tokens ADD COLUMN token_hash TEXT');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error (refresh_tokens.token_hash):', e.message);
  }

  // Migration: add token_hash to password_resets if missing
  try {
    db.run('ALTER TABLE password_resets ADD COLUMN token_hash TEXT');
  } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error (password_resets.token_hash):', e.message);
  }

  // Performance Indexes (Critical for Scale)
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_chat_id_desc ON messages(chat_id, id DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_server_members_user ON server_members(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON read_receipts(message_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_chats_server_type_created ON chats(server_id, type, created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status ON friend_requests(receiver_id, status, created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status ON friend_requests(sender_id, status, created_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_password_resets_expiry ON password_resets(expires_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)');
  db.run('CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash)');


  // Save to disk (initial save)
  saveDatabase(true);

  console.log('📦 Database initialized');

  // Handle graceful shutdown
  const handleExit = () => {
    console.log('Hyperspace closing... saving database...');
    saveDatabase(true);
    process.exit(0);
  };
  if (!signalsRegistered) {
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    signalsRegistered = true;
  }
}

let saveTimeout = null;
const SAVE_DELAY_MS = 5000;

function saveDatabase(immediate = false) {
  if (process.env.NODE_ENV === 'test') return;
  
  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (db) {
      try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        // console.log('💾 Database synced to disk');
      } catch (err) {
        console.error('Failed to save database:', err);
      }
    }
    return;
  }

  // Debounced save
  if (!saveTimeout) {
    saveTimeout = setTimeout(() => {
      saveDatabase(true);
      saveTimeout = null;
    }, SAVE_DELAY_MS);
  }
}

// Run a parameterized statement and return lastInsertRowid and changes
function runStatement(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    stmt.step();
    stmt.free();

    // For INSERTs, get the lastInsertRowid via sql.js
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const result = db.exec('SELECT last_insert_rowid() as id');
      if (result.length > 0 && result[0].values.length > 0) {
        const id = result[0].values[0][0];
        saveDatabase();
        return { lastInsertRowid: id, changes: 1 };
      }
    }

    // For UPDATE/DELETE, get actual rows modified
    const changes = db.getRowsModified();
    saveDatabase();
    return { lastInsertRowid: 0, changes };
  } catch (err) {
    console.error('DB run error:', sql, params, err.message);
    throw err;
  }
}

// Get a single row
function getRow(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }

    const columns = stmt.getColumnNames();
    const values = stmt.get();
    stmt.free();

    const obj = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return obj;
  } catch (err) {
    console.error('DB get error:', sql, params, err.message);
    throw err;
  }
}

// Get all rows
function getAllRows(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results = [];
    const columns = stmt.getColumnNames();

    while (stmt.step()) {
      const values = stmt.get();
      const obj = {};
      columns.forEach((col, i) => obj[col] = values[i]);
      results.push(obj);
    }

    stmt.free();
    return results;
  } catch (err) {
    console.error('DB all error:', sql, params, err.message);
    throw err;
  }
}

// Helper functions to match better-sqlite3 API
function getDb() {
  return {
    prepare: (sql) => ({
      run: (...params) => runStatement(sql, params),
      get: (...params) => getRow(sql, params),
      all: (...params) => getAllRows(sql, params)
    }),
    exec: (sql) => {
      db.run(sql);
      saveDatabase();
    }
  };
}

module.exports = {
  get db() { return getDb(); },
  initializeDatabase
};
