require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// PostgreSQL接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabaseなどのホスト環境で必要
  }
});

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

// テーブルの自動作成（非同期）
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        comment TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        tags TEXT,
        lat REAL,
        lng REAL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}
initDb();

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 投稿一覧の取得
app.get('/posts', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 投稿の更新
app.put('/post/:id', async (req, res) => {
  const { id } = req.params;
  const { name, comment, tags } = req.body;
  try {
    await pool.query(
      'UPDATE posts SET name = $1, comment = $2, tags = $3 WHERE id = $4',
      [name, comment, tags, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 投稿の削除
app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 画像パスを取得してファイルを削除
    const { rows } = await pool.query('SELECT image_url FROM posts WHERE id = $1', [id]);
    const post = rows[0];
    
    if (post && post.image_url) {
      const filePath = path.join(__dirname, post.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// いいねの追加
app.post('/post/:id/like', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
    if (result.rowCount > 0) {
      res.json({ success: true, likes: result.rows[0].likes });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新規投稿
app.post('/post', upload.single('image'), async (req, res) => {
  const { name, comment, tags, lat, lng } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !comment) {
    return res.status(400).json({ error: 'Name and comment are required' });
  }

  try {
    await pool.query(
      'INSERT INTO posts (name, comment, tags, lat, lng, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, comment, tags || '', lat || null, lng || null, imageUrl]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kyoto app running at http://localhost:${PORT}`);
});
