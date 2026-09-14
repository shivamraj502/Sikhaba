const express = require('express');
const router = express.Router();
const roomController = require('./room.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware); // every room route requires login

router.post('/', roomController.createRoom);                          // create room (become host)
router.get('/', roomController.getLiveRooms);                         // list live rooms
router.post('/:id/join', roomController.joinRoom);                    // join as listener
router.post('/:id/leave', roomController.leaveRoom);                  // leave room
router.post('/:id/end', roomController.endRoom);                      // host ends room

router.post('/:id/speak-request', roomController.requestToSpeak);              // listener applies to speak
router.get('/:id/speak-requests', roomController.getPendingRequests);          // host views pending requests
router.post('/:id/speak-requests/:requestId/respond', roomController.respondToRequest); // host approves/rejects

module.exports = router;