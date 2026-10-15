const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const WS_URL = process.env.LIVEKIT_URL; 
const HTTP_URL = (WS_URL || '').replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');

const roomService = new RoomServiceClient(HTTP_URL, API_KEY, API_SECRET);

async function createToken({ roomName, identity, name, canPublish }) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: String(identity),
    name,
    ttl: '2h'
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
    canPublishData: true
  });
  return await at.toJwt();
}

// Listener -> speaker, live, no reconnect needed
async function promoteToSpeaker(roomName, identity) {
  try {
    await roomService.updateParticipant(roomName, String(identity), undefined, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });
  } catch (err) {
    console.error('LiveKit promote failed:', err.message);
  }
}

async function closeLiveKitRoom(roomName) {
  try {
    await roomService.deleteRoom(roomName);
  } catch (err) {
    console.error('LiveKit deleteRoom failed:', err.message);
  }
}

module.exports = { createToken, promoteToSpeaker, closeLiveKitRoom };