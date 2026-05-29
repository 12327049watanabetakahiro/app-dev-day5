const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const db = new Database('kyoto.db');

// アップロード先フォルダの作成
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// multerの設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// テーブルの自動作成
db.prepare(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    comment TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    tags TEXT,
    lat REAL,
    lng REAL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 投稿一覧の取得
app.get('/posts', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 投稿の更新
app.put('/post/:id', (req, res) => {
  const { id } = req.params;
  const { name, comment, tags } = req.body;
  try {
    const stmt = db.prepare('UPDATE posts SET name = ?, comment = ?, tags = ? WHERE id = ?');
    stmt.run(name, comment, tags, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 投稿の削除
app.delete('/post/:id', (req, res) => {
  const { id } = req.params;
  try {
    // 画像パスを取得してファイルを削除
    const post = db.prepare('SELECT image_url FROM posts WHERE id = ?').get(id);
    if (post && post.image_url) {
      const filePath = path.join(__dirname, post.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// いいねの追加
app.post('/post/:id/like', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes > 0) {
      const updated = db.prepare('SELECT likes FROM posts WHERE id = ?').get(id);
      res.json({ success: true, likes: updated.likes });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新規投稿
app.post('/post', upload.single('image'), (req, res) => {
  const { name, comment, tags, lat, lng } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !comment) {
    return res.status(400).json({ error: 'Name and comment are required' });
  }

  try {
    const stmt = db.prepare('INSERT INTO posts (name, comment, tags, lat, lng, image_url) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(name, comment, tags || '', lat || null, lng || null, imageUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kyoto app running at http://localhost:${PORT}`);
});
