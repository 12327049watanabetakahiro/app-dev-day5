const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('kyoto.db');

// テーブルの自動作成
// id, name (場所名), comment (コメント), created_at (投稿日時)
db.prepare(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

app.use(express.json());
app.use(express.static(__dirname));

// 投稿一覧の取得
app.get('/posts', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新規投稿
app.post('/post', (req, res) => {
  const { name, comment } = req.body;
  if (!name || !comment) {
    return res.status(400).json({ error: 'Name and comment are required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO posts (name, comment) VALUES (?, ?)');
    stmt.run(name, comment);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001; // ポートを変更（投票アプリと重複しないように）
app.listen(PORT, () => {
  console.log(`Kyoto app running at http://localhost:${PORT}`);
});
