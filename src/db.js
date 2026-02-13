
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'app.sqlite');
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbFile);

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function initDb() {
  // Tablas
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  // Seed (si no existe)
  await exec(`
    INSERT OR IGNORE INTO users (id, username, password, role) VALUES
      (1, 'alice', 'password123', 'user'),
      (2, 'bob', 'secret', 'user'),
      (3, 'admin', 'admin', 'admin');

    INSERT OR IGNORE INTO notes (id, owner, title, content) VALUES
      (1, 'alice', 'Nota 1', 'Contenido de Alice'),
      (2, 'bob', 'Nota 2', 'Contenido de Bob'),
      (3, 'admin', 'Admin note', 'Secreto del admin');
  `);
}

module.exports = { db, initDb };
