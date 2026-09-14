const { pool } = require('../config/db');

function registerRoomEvents(io, socket) {
  socket.on('join-room', async ({ room_id }) => {
    socket.join(`room-${room_id}`);
    socket.currentRoom = room_id;

    // Notify others in the room
    socket.to(`room-${room_id}`).emit('participant-joined', {
      user_id: socket.user.id,
      name: socket.user.name
    });
  });

  socket.on('leave-room', ({ room_id }) => {
    socket.leave(`room-${room_id}`);
    socket.to(`room-${room_id}`).emit('participant-left', {
      user_id: socket.user.id
    });
  });

  socket.on('raise-hand', ({ room_id }) => {
    // Just a real-time notification — the actual DB record is created via 
    // POST /api/rooms/:id/speak-request (REST). This socket event notifies the host instantly.
    io.to(`room-${room_id}`).emit('hand-raised', {
      user_id: socket.user.id,
      name: socket.user.name
    });
  });

  socket.on('respond-to-speaker', ({ room_id, target_user_id, approve }) => {
    // Called by host AFTER hitting approve/reject via REST — this just broadcasts the result live
    io.to(`room-${room_id}`).emit(approve ? 'speaker-approved' : 'speaker-rejected', {
      user_id: target_user_id
    });
  });

  socket.on('mic-toggle', ({ room_id, is_muted }) => {
    socket.to(`room-${room_id}`).emit('mic-status-changed', {
      user_id: socket.user.id,
      is_muted
    });
  });

  socket.on('end-room', async ({ room_id }) => {
    io.to(`room-${room_id}`).emit('room-ended');
    io.socketsLeave(`room-${room_id}`); // force everyone out of the socket room
  });
}

module.exports = registerRoomEvents;