require('dotenv').config();

const path = require('path');
const express = require('express');

const { initDb, db } = require('./src/db');

const app = express();

// ⚠️ Intencionalmente NO usamos helmet(), CSP, etc. (Security Misconfiguration)
// ⚠️ Intencionalmente dejamos Express revelar X-Powered-By

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ⚠️ "Cookie parser" casero e incompleto (no usar en producción)
app.use((req, res, next) => {
  const raw = req.headers.cookie || '';
  const cookies = {};
  raw.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (!k) return;
    cookies[k] = decodeURIComponent(v);
  });
  req.cookies = cookies;
  next();
});

// Static
app.use('/public', express.static(path.join(__dirname, 'src', 'public')));

// DB en app locals
app.locals.db = db;

// Routes
app.use('/', require('./src/routes/web'));
app.use('/api', require('./src/routes/api'));

// Simple docs
app.get('/api-docs', (req, res) => {
  res.render('api-docs', { title: 'API Docs' });
});

// ⚠️ Error handler VERBOSO (Information disclosure)
app.use((err, req, res, next) => {
  res.status(500).send(`<h1>Error</h1><pre>${err.stack}</pre>`);
});

// Start
const port = Number(process.env.PORT || 3000);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ App (vulnerable) corriendo en http://localhost:${port}`);
      console.log(`📄 Guía ZAP: abre ZAP-GUIDE.md`);
    });
  })
  .catch((e) => {
    console.error('DB init error:', e);
    process.exit(1);
  });
