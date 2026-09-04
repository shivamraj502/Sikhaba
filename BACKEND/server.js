const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Health check route — confirms server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sikhaba backend is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await testConnection();
});