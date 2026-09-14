function registerPresenceEvents(io, socket) {
  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      socket.to(`room-${socket.currentRoom}`).emit('participant-left', {
        user_id: socket.user.id
      });
    }
  });
}

module.exports = registerPresenceEvents;