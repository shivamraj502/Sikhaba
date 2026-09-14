const express = require('express');
const cors = require('cors');
const http = require('http');  
require('dotenv').config();

const { testConnection } = require('./config/db');
const authRoutes = require('./modules/auth/auth.routes');
const authMiddleware = require('./middlewares/authMiddleware');
const roomRoutes = require('./modules/rooms/room.routes');
const initSocket = require('./sockets/index');
const moderationRoutes = require('./modules/moderation/moderation.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/moderation', moderationRoutes);

// Health check route — confirms server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sikhaba backend is running' });
});

const server = http.createServer(app);                  
initSocket(server);  

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {                        // ← changed from app.listen to server.listen
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await testConnection();
});