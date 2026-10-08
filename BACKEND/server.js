const express = require('express');
const http = require('http');
require('dotenv').config();

const corsMiddleware = require('./config/cors');
const { testConnection } = require('./config/db');
const authRoutes = require('./modules/auth/auth.routes');
const roomRoutes = require('./modules/rooms/room.routes');
const initSocket = require('./sockets/index');
const moderationRoutes = require('./modules/moderation/moderation.routes');
const subscriptionRoutes = require('./modules/subscription/subscription.routes');
const startExpireSubscriptionsJob = require('./jobs/expireSubscriptions');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(corsMiddleware);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/subscription', subscriptionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sikhaba backend is running' });
});

app.use(errorHandler); // must be after routes

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await testConnection();
});

startExpireSubscriptionsJob();