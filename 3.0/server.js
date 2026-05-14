const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('votes.db');

// テーブルの自動作成
db.prepare(`
  CREATE TABLE IF NOT EXISTS votes (
    option_name TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  )
`).run();

// 初期の選択肢を登録（存在しない場合のみ）
const initialOptions = ['soccer', 'baseball', 'basketball', 'tennis'];
const insertInitial = db.prepare('INSERT OR IGNORE INTO votes (option_name, count) VALUES (?, 0)');
initialOptions.forEach(opt => insertInitial.run(opt));

app.use(express.json());
app.use(express.static(__dirname));

// 集計結果の取得
app.get('/votes', (req, res) => {
  try {
    const rows = db.prepare('SELECT option_name as "option", count FROM votes').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 投票の登録
app.post('/vote', (req, res) => {
  const { option } = req.body;
  if (!option) return res.status(400).json({ error: 'Option is required' });

  try {
    const stmt = db.prepare(`
      INSERT INTO votes (option_name, count) VALUES (?, 1)
      ON CONFLICT(option_name) DO UPDATE SET count = count + 1
    `);
    stmt.run(option);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
