
const express = require('express');
const router = express.Router();

/**
 * ⚠️ Vulnerabilidades intencionales:
 * - SQL Injection en /users (concatena strings)
 * - IDOR en /notes/:id (sin auth/ownership check)
 * - CORS permisivo
 */

// CORS abierto (misconfig)
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // ⚠️
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

router.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// SQLi: /api/users?name=...
router.get('/users', (req, res, next) => {
  const name = (req.query.name || '').trim();
  const sql = "SELECT id, username, role FROM users WHERE username = '" + name + "'"; // ⚠️ SQLi
  req.app.locals.db.all(sql, (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

// Crear nota (sin auth)
router.post('/notes', (req, res, next) => {
  const owner = req.body.owner || 'anon';
  const title = req.body.title || 'sin título';
  const content = req.body.content || '';

  req.app.locals.db.run(
    'INSERT INTO notes(owner, title, content) VALUES(?,?,?)',
    [owner, title, content],
    function (err) {
      if (err) return next(err);
      res.status(201).json({ id: this.lastID, owner, title, content });
    }
  );
});

// IDOR: cualquiera puede ver cualquier nota
router.get('/notes/:id', (req, res, next) => {
  const id = req.params.id;
  req.app.locals.db.get('SELECT id, owner, title, content FROM notes WHERE id = ?', [id], (err, row) => {
    if (err) return next(err);
    res.json(row || null);
  });
});

// Refleja input (potencial XSS en cliente que consuma JSON)
router.get('/echo', (req, res) => {
  res.json({ q: req.query.q || '' });
});

module.exports = router;
