const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors()); // handle preflight

app.use(express.json());
app.use(express.static('public'));

// Initialize database
const db = new sqlite3.Database('./zenscore.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_name TEXT NOT NULL,
    category TEXT NOT NULL,
    duration INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Routes: Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (row) return res.status(400).json({ error: 'User already exists' });
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to create user' });
          const token = jwt.sign(
            { id: this.lastID, email, name },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          res.json({ token, user: { id: this.lastID, name, email } });
        }
      );
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Routes: Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Route: Get user score
app.get('/api/score', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.get('SELECT score FROM scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const score = row ? row.score : 72; // default score
    res.json({ score, trend: "up", change: 5 });
  });
});

// Route: Get user stats
app.get('/api/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(`SELECT category, SUM(duration) as total_duration FROM sessions WHERE user_id = ? GROUP BY category`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    let totalDuration = 0;
    const breakdown = { productive: 0, restful: 0, neutral: 0, distractive: 0 };
    rows.forEach(r => {
      totalDuration += r.total_duration;
      breakdown[r.category] = r.total_duration;
    });
    const total = totalDuration || 1; // prevent division by zero
    const focusPercent = Math.round((breakdown.productive / total) * 100);
    res.json({ 
      totalDuration: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
      focusRate: `${focusPercent}%`,
      breakdown
    });
  });
});

// Route: Get AI insights
app.get('/api/insights', authenticateToken, (req, res) => {
  const insights = [
    "Keep up your focus sessions! Consider deep work in the mornings.",
    "Use Pomodoro technique periodically for sustained focus.",
    "Well-balanced rest periods are helping productivity.",
    "Minimize distractions during peak hours.",
    "Balance work and rest for consistent performance."
  ];
  const insight = insights[Math.floor(Math.random() * insights.length)];
  res.json({ insight, recommendations: [{ type: 'schedule', message: 'Schedule deep work in morning', priority: 'high' }] });
});

// Route: Get user sessions
app.get('/api/sessions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  db.all('SELECT id, app_name AS appName, category, duration, created_at AS startTime FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.get('SELECT COUNT(*) AS total FROM sessions WHERE user_id = ?', [userId], (err, countRow) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ sessions: rows, total: countRow.total });
    });
  });
});

// Route: Create session
app.post('/api/sessions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { appName, category, duration } = req.body;
  if (!appName || !category || !duration) return res.status(400).json({ error: 'All fields required' });
  db.run('INSERT INTO sessions (user_id, app_name, category, duration) VALUES (?, ?, ?, ?)', [userId, appName, category, duration], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to create session' });
    // update score
    db.get('SELECT score FROM scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId], (err, row) => {
      let currScore = row ? row.score : 72;
      let change = 0;
      switch (category) {
        case 'productive': change = 3; break;
        case 'restful': change = 2; break;
        case 'neutral': change = 0; break;
        case 'distractive': change = -3; break;
      }
      const newScore = Math.max(0, Math.min(100, currScore + change));
      db.run('INSERT INTO scores (user_id, score) VALUES (?, ?)', [userId, newScore], () => {
        res.status(201).json({ id: this.lastID, appName, category, duration, startTime: new Date().toISOString() });
      });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});