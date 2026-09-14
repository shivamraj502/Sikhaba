const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const registerRoomEvents = require('./roomEvents');
const registerPresenceEvents = require('./presenceEvents');

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
  });

  // Authenticate every socket connection using the same JWT from login
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.id}`);

    registerRoomEvents(io, socket);
    registerPresenceEvents(io, socket);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user.id}`);
    });
  });

  return io;
}

module.exports = initSocket;