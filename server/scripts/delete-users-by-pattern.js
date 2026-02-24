#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const pattern = (process.argv[2] || 'aim').trim().toLowerCase();
const explicitDbPath = process.argv[3];

if (!pattern) {
  console.error('Usage: node scripts/delete-users-by-pattern.js <pattern> [dbPath]');
  process.exit(1);
}

const serverRoot = path.resolve(__dirname, '..');
const sqlitePath = path.join(serverRoot, 'data', 'penthouse.sqlite');
const legacyPath = path.join(serverRoot, 'data', 'penthouse.db');
const dbPath = explicitDbPath
  ? path.resolve(explicitDbPath)
  : (fs.existsSync(sqlitePath) ? sqlitePath : legacyPath);

if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const like = `%${pattern}%`;
const users = db.prepare(`
  SELECT id, username, email, display_name
  FROM users
  WHERE lower(ifnull(username, '')) LIKE ?
     OR lower(ifnull(display_name, '')) LIKE ?
     OR lower(ifnull(email, '')) LIKE ?
  ORDER BY id
`).all(like, like, like);

if (users.length === 0) {
  console.log(`No users matched pattern "${pattern}" in ${dbPath}`);
  db.close();
  process.exit(0);
}

const ids = users.map((u) => u.id);
const placeholders = ids.map(() => '?').join(',');

const run = db.transaction(() => {
  db.prepare(`UPDATE servers SET owner_id = NULL WHERE owner_id IN (${placeholders})`).run(...ids);
  db.prepare(`UPDATE chats SET created_by = NULL WHERE created_by IN (${placeholders})`).run(...ids);
  db.prepare(`UPDATE server_invites SET created_by = NULL WHERE created_by IN (${placeholders})`).run(...ids);
  db.prepare(`UPDATE pinned_messages SET pinned_by = NULL WHERE pinned_by IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...ids);
});

run();

console.log(`Deleted ${users.length} user(s) matching "${pattern}" from ${dbPath}:`);
for (const user of users) {
  console.log(`- id=${user.id} username=${user.username} email=${user.email || ''} display_name=${user.display_name || ''}`);
}

db.close();
