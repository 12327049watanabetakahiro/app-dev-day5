const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// すべてのリクエストに対して index.html を返す（SPA構成・Express 5 互換）
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`City Log (Cloud) running at http://localhost:${PORT}`);
});
