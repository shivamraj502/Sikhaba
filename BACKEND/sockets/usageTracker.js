const usageService = require('../modules/subscription/usageTimer.service');
const roomService = require('../modules/rooms/room.service');
const {
  listActiveLiveKitRooms,
  listLiveKitParticipants,
  removeFromLiveKit
} = require('../config/livekit');

const TICK_MS = 15 * 1000;

let io = null;
let running = false;
let lastTick = Date.now();

async function enforceLimit(user_id, roomIds) {
  // Tell the user first, so their client shows the message and leaves
  io.to(`user-${user_id}`).emit('time-limit-reached', {});

  for (const room_id of roomIds) {
    try {
      const room = await roomService.getRoomById(room_id);
      io.in(`user-${user_id}`).socketsLeave(`room-${room_id}`);

      if (room.host_id === user_id) {
        // Out of time as host: the room ends (this also closes the LiveKit room)
        await roomService.endRoom({ room_id, host_id: user_id });
        io.to(`room-${room_id}`).emit('room-ended');
        io.socketsLeave(`room-${room_id}`);
      } else {
        await roomService.leaveRoom({ room_id, user_id });
        await removeFromLiveKit(`room-${room_id}`, user_id);
        io.to(`room-${room_id}`).emit('participant-left', { user_id });
      }
    } catch (err) {
      console.error('enforceLimit failed:', err.message);
    }
  }
}

async function tick() {
  if (running) return;
  running = true;

  const now = Date.now();
  // Capped, so a delayed tick can never over-charge anyone
  const elapsed = Math.min(Math.round((now - lastTick) / 1000), (TICK_MS / 1000) * 2);
  lastTick = now;

  try {
    // Who is connected to audio right now (LiveKit is the source of truth)
    const present = new Map(); // user_id -> Set of room ids
    const lkRooms = await listActiveLiveKitRooms();

    for (const lkRoom of lkRooms) {
      if (!lkRoom.name.startsWith('room-')) continue;
      const room_id = Number(lkRoom.name.slice(5));
      const people = await listLiveKitParticipants(lkRoom.name);

      for (const p of people) {
        const user_id = Number(p.identity);
        if (!present.has(user_id)) present.set(user_id, new Set());
        present.get(user_id).add(room_id);
      }
    }

    // A user in two rooms is charged once
    for (const [user_id, roomIds] of present) {
      if (await usageService.isUnlimited(user_id)) continue;

      await usageService.addUsageSeconds(user_id, elapsed);
      const status = await usageService.getUsageStatus(user_id);

      io.to(`user-${user_id}`).emit('usage-update', {
        unlimited: false,
        seconds_remaining: status.seconds_remaining
      });

      if (!status.allowed) await enforceLimit(user_id, roomIds);
    }
  } catch (err) {
    console.error('Usage tick failed:', err.message);
  } finally {
    running = false;
  }
}

function initUsageTracker(socketServer) {
  io = socketServer;
  lastTick = Date.now();
  setInterval(tick, TICK_MS);
  console.log('⏱️  Usage tracker started');
}

module.exports = { 
    initUsageTracker 
};