const { pool } = require('../config/db');

function registerPresenceEvents(io, socket) {
  socket.on('disconnect', async () => {
    if (socket.currentRoom) {
      try {
        await pool.query(
          `UPDATE room_participants SET left_at = NOW() 
           WHERE room_id = ? AND user_id = ? AND left_at IS NULL`,
          [socket.currentRoom, socket.user.id]
        );
      } catch (err) {
        console.error('Failed to mark participant left on disconnect:', err.message);
      }

      socket.to(`room-${socket.currentRoom}`).emit('participant-left', {
        user_id: socket.user.id
      });
    }
  });
}

module.exports = registerPresenceEvents;