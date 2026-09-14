const roomService = require('./room.service');
const speakerQueueService = require('./speakerQueue.service');

async function createRoom(req, res) {
  try {
    const { title, language } = req.body;
    const room = await roomService.createRoom({ host_id: req.user.id, title, language });
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getLiveRooms(req, res) {
  try {
    const rooms = await roomService.getLiveRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function joinRoom(req, res) {
  try {
    const participant = await roomService.joinRoom({ room_id: req.params.id, user_id: req.user.id });
    res.json(participant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function leaveRoom(req, res) {
  try {
    const result = await roomService.leaveRoom({ room_id: req.params.id, user_id: req.user.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function endRoom(req, res) {
  try {
    const result = await roomService.endRoom({ room_id: req.params.id, host_id: req.user.id });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function requestToSpeak(req, res) {
  try {
    const request = await speakerQueueService.requestToSpeak({ room_id: req.params.id, user_id: req.user.id });
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

async function getPendingRequests(req, res) {
  try {
    const requests = await speakerQueueService.getPendingRequests(req.params.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function respondToRequest(req, res) {
  try {
    const { approve } = req.body;
    const result = await speakerQueueService.respondToRequest({
      request_id: req.params.requestId,
      host_id: req.user.id,
      approve
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

module.exports = {
  createRoom,
  getLiveRooms,
  joinRoom,
  leaveRoom,
  endRoom,
  requestToSpeak,
  getPendingRequests,
  respondToRequest
};