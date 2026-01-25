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

async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
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
      password TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
  } catch (e) { /* Column may already exist */ }
  try {
    db.run('ALTER TABLE messages ADD COLUMN deleted_at DATETIME DEFAULT NULL');
  } catch (e) { /* Column may already exist */ }

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

  // Save to disk
  saveDatabase();

  console.log('📦 Database initialized');
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Run a parameterized statement and return lastInsertRowid
function runStatement(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    stmt.step();
    stmt.free();

    // Get last insert rowid immediately after
    const result = db.exec("SELECT last_insert_rowid() as id");
    const lastId = result.length > 0 ? result[0].values[0][0] : 0;

    saveDatabase();
    return { lastInsertRowid: lastId };
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
