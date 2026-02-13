
const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const router = express.Router();

// Home
router.get('/', (req, res) => {
  res.render('index', { title: 'Home', user: req.cookies.user || null });
});

// ⚠️ Cookie insegura (sin HttpOnly/Secure)
router.get('/set-user', (req, res) => {
  const user = req.query.user || 'anon';
  res.cookie('user', user); // ⚠️
  res.redirect('/');
});

// Login pages
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null });
});

// ⚠️ SQLi en login (concatena user/pass)
router.post('/do-login', (req, res, next) => {
  const u = req.body.username || '';
  const p = req.body.password || '';

  const sql = "SELECT username, role FROM users WHERE username='" + u + "' AND password='" + p + "'"; // ⚠️ SQLi
  req.app.locals.db.get(sql, (err, row) => {
    if (err) return next(err);

    if (!row) {
      return res.status(401).render('login', { title: 'Login', error: 'Credenciales inválidas' });
    }

    // ⚠️ Cookie de sesión débil/insegura
    res.cookie('session', `${row.username}:${row.role}`); // ⚠️ sin flags
    res.redirect('/profile');
  });
});

router.get('/profile', (req, res) => {
  const session = req.cookies.session || null;
  res.render('profile', { title: 'Perfil', session });
});

// Comments (Stored XSS: render sin escape)
router.get('/comments', (req, res, next) => {
  req.app.locals.db.all('SELECT id, text, created_at FROM comments ORDER BY id DESC', (err, rows) => {
    if (err) return next(err);
    res.render('comments', { title: 'Comentarios', comments: rows });
  });
});

router.post('/comments', (req, res, next) => {
  const text = req.body.text || '';
  req.app.locals.db.run(
    'INSERT INTO comments(text, created_at) VALUES(?,?)',
    [text, new Date().toISOString()],
    (err) => (err ? next(err) : res.redirect('/comments'))
  );
});

// Search (Reflected XSS: usa <%- %> en la vista)
router.get('/search', (req, res) => {
  const q = req.query.q || '';
  res.render('search', { title: 'Búsqueda', q });
});

// Open Redirect
router.get('/redirect', (req, res) => {
  const url = req.query.url || '/';
  res.redirect(url); // ⚠️
});

// Path Traversal / LFI (lectura de archivos)
router.get('/file', (req, res) => {
  const name = req.query.name || 'README.md';
  const filePath = path.join(__dirname, '..', '..', name); // ⚠️ permite ../
  res.sendFile(filePath);
});

// Command Injection (ping)
router.get('/tools/ping', (req, res) => {
  const host = req.query.host || '127.0.0.1';
  const baseCmd = (process.platform === 'win32') ? 'ping -n 1 ' : 'ping -c 1 ';
  exec(baseCmd + host, (err, stdout, stderr) => { // ⚠️
    res.type('html').send(`
      <h1>Ping</h1>
      <p>host=${host}</p>
      <pre>${stdout || ''}</pre>
      <pre>${stderr || ''}</pre>
    `);
  });
});

// Broken Access Control (ruta admin sin protección)
router.get('/admin', (req, res) => {
  res.render('admin', { title: 'Admin', secret: 'FLAG{no_deberias_ver_esto_sin_auth}' });
});

// Notes list (sin auth)
router.get('/notes', (req, res, next) => {
  req.app.locals.db.all('SELECT id, owner, title FROM notes ORDER BY id DESC', (err, rows) => {
    if (err) return next(err);
    res.render('notes', { title: 'Notas', notes: rows });
  });
});

// CSRF (form de borrado sin token)
router.post('/notes/delete', (req, res, next) => {
  const id = req.body.id;
  req.app.locals.db.run('DELETE FROM notes WHERE id = ?', [id], (err) => {
    if (err) return next(err);
    res.redirect('/notes');
  });
});

module.exports = router;
