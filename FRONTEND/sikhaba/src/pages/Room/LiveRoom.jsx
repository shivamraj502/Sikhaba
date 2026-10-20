import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { connectSocket } from '../../sockets/socketClient';
import {
  getRoomById,
  requestToSpeak,
  getPendingRequests,
  respondToRequest,
  endRoom,
  leaveRoom,
  getChatHistory,
  getActiveParticipants,
  getLiveKitToken,
  joinRoom,
  removeSpeaker,
} from '../../api/roomApi';
import { connectAudio, setMic, startAudioPlayback, disconnectAudio } from '../../webrtc/liveKitClient';

function LiveRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState({});
  const [handsRaised, setHandsRaised] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [mySpeakerStatus, setMySpeakerStatus] = useState(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioStatus, setAudioStatus] = useState('connecting'); // connecting | connected | failed
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  const isHost = room && user && Number(room.host_id) === Number(user.id);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      
      let roomData;
      try {
        const roomRes = await getRoomById(roomId);
        roomData = roomRes.data;
        setRoom(roomData);
      } catch (err) {
        alert("Room not found");
        navigate("/home");
        return;
      }

      try {
        await joinRoom(roomId);
      } catch (err) {
        alert(err.response?.data?.message || "Unable to join room");
        navigate("/home");
        return;
      }

      const amHost = Number(roomData.host_id) === Number(user.id);

      try {
        const historyRes = await getChatHistory(roomId);
        setMessages(historyRes.data.map((m) => ({ user: m.name, text: m.message })));
      } catch (err) {
        console.error('Failed to load chat history');
      }

      if (amHost) {
        try {
          const pendingRes = await getPendingRequests(roomId);
          setPendingRequests(pendingRes.data);
        } catch (err) {
          console.error('Failed to load pending requests');
        }
      }

      await loadParticipants();

      const token = localStorage.getItem('token');
      const socket = connectSocket(token);
      socketRef.current = socket;

      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('hand-raised');
      socket.off('speaker-approved');
      socket.off('speaker-rejected');
      socket.off('room-ended');
      socket.off('new-message');
      socket.off('speaker-removed');  

      socket.emit('join-room', { room_id: roomId });

      socket.on('participant-joined', () => { loadParticipants(); });   

      socket.on('participant-left', (data) => {
        setParticipants((prev) => {
          const updated = { ...prev };
          delete updated[data.user_id];
          return updated;
        });
      });

      socket.on('hand-raised', (data) => {
        setHandsRaised((prev) => [...prev, data]);

        if (amHost) {
          getPendingRequests(roomId)
            .then((res) => setPendingRequests(res.data))
            .catch(() => {});
        }
      });

      socket.on("speaker-approved", (data) => {
        if (data.user_id === user.id) setMySpeakerStatus("approved");
        setHandsRaised((prev) =>
          prev.filter((h) => h.user_id !== data.user_id),
        );
        loadParticipants();
      });

      socket.on('speaker-rejected', (data) => {
        if (data.user_id === user.id) setMySpeakerStatus('rejected');
        setHandsRaised((prev) => prev.filter((h) => h.user_id !== data.user_id));
      });

      socket.on('room-ended', () => {
        alert('This room has ended.');
        navigate('/home');
      });

      socket.on('new-message', (data) => {
        setMessages((prev) => [...prev, { user: data.name, text: data.message }]);
      });

      socket.on("speaker-removed", (data) => {
        if (data.user_id === user.id) {
          setMySpeakerStatus(null); // brings the Raise Hand button back
          setCanSpeak(false);
          setMicOn(false);
        }
        loadParticipants();
      });

      if (cancelled) return;
      try {
        const { data } = await getLiveKitToken(roomId);
        if (cancelled) return;
        await connectAudio({
          url: data.url,
          token: data.token,
          onPermissionChange: (allowed) => {
            setCanSpeak(allowed);
            if (!allowed) setMicOn(false);
          },
          onSpeakersChange: setActiveSpeakers,
          onAudioBlockedChange: setAudioBlocked,
        });
        setCanSpeak(data.canPublish);
        setAudioStatus('connected');
      } catch (err) {
        console.error('Audio connect failed:', err);
        setAudioStatus('failed');
      }
    }

    init();

    return () => {
      const socket = socketRef.current;
      cancelled = true;
      disconnectAudio();
      if (socket) {
        socket.emit('leave-room', { room_id: roomId });
        socket.off('participant-joined');
        socket.off('participant-left');
        socket.off('hand-raised');
        socket.off('speaker-approved');
        socket.off('speaker-rejected');
        socket.off('room-ended');
        socket.off('new-message');
        socket.off('speaker-removed');
      }
    };
  }, [roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleRaiseHand() {
    try {
      await requestToSpeak(roomId);
      setMySpeakerStatus('pending');
      socketRef.current.emit('raise-hand', { room_id: roomId });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to raise hand');
    }
  }

  async function handleRespond(requestId, targetUserId, approve) {
    try {
      await respondToRequest(roomId, requestId, approve);
      socketRef.current.emit('respond-to-speaker', { room_id: roomId, target_user_id: targetUserId, approve });
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond');
    }
  }

  async function handleEndRoom() {
    try {
      await endRoom(roomId);
      socketRef.current.emit('end-room', { room_id: roomId });
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end room');
    }
  }

  async function handleLeaveRoom() {
    try {
      await leaveRoom(roomId);
    } catch (err) {
      // non-fatal
    }
    navigate('/home');
  }

  function handleSendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current.emit('send-message', { room_id: roomId, message: chatInput });
    setChatInput('');
  }

  // (d) NEW: mic toggle
  async function handleToggleMic() {
    try {
      const next = !micOn;
      await setMic(next);
      setMicOn(next);
    } catch (err) {
      alert('Could not access microphone. Check your browser permission.');
    }
  }

  async function loadParticipants() {
  try {
    const res = await getActiveParticipants(roomId);
    const map = {};
    res.data.forEach((p) => {
      map[p.user_id] = { name: p.name, country_code: p.country_code, role: p.role };
    });
    setParticipants(map);
  } catch (err) {
    console.error('Failed to load participants');
  }
  }

  async function handleRemoveSpeaker(targetUserId) {
    try {
      await removeSpeaker(roomId, targetUserId);
      socketRef.current.emit("remove-speaker", {
        room_id: roomId,
        target_user_id: targetUserId,
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove speaker");
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "20px auto", padding: "0 16px" }}>
      <h2>🎙️ Live Room #{roomId}</h2>

      {/* (e) NEW: audio status / enable audio / mic button */}
      <div style={{ marginBottom: 16 }}>
        {audioStatus === "connecting" && <span>🔄 Connecting audio...</span>}
        {audioStatus === "connected" && <span>🔊 Audio connected</span>}
        {audioStatus === "failed" && (
          <span style={{ color: "red" }}>❌ Audio failed to connect</span>
        )}

        {audioBlocked && (
          <button onClick={startAudioPlayback} style={{ marginLeft: 8 }}>
            🔊 Tap to enable audio
          </button>
        )}

        {canSpeak && audioStatus === "connected" && (
          <button onClick={handleToggleMic} style={{ marginLeft: 8 }}>
            {micOn ? "🎙️ Mute" : "🔇 Unmute"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {!isHost && mySpeakerStatus !== "approved" && (
          <button
            onClick={handleRaiseHand}
            disabled={mySpeakerStatus === "pending"}
          >
            {mySpeakerStatus === "pending"
              ? "✋ Request sent..."
              : "✋ Raise Hand to Speak"}
          </button>
        )}
        {mySpeakerStatus === "approved" && (
          <span>🎤 You're approved to speak!</span>
        )}
        {mySpeakerStatus === "rejected" && (
          <span>❌ Your request was declined.</span>
        )}

        {isHost && (
          <button onClick={handleEndRoom} style={{ color: "red" }}>
            End Room
          </button>
        )}
        {!isHost && <button onClick={handleLeaveRoom}>Leave Room</button>}
      </div>

      {isHost && pendingRequests.length > 0 && (
        <div
          style={{ border: "1px solid #f0ad4e", padding: 10, marginBottom: 16 }}
        >
          <h4>Speaker Requests</h4>
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span>
                {req.name} {req.country_code && `(${req.country_code})`}
              </span>
              <div>
                <button
                  onClick={() => handleRespond(req.id, req.user_id, true)}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleRespond(req.id, req.user_id, false)}
                  style={{ marginLeft: 6 }}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h4>👥 Participants ({Object.keys(participants).length})</h4>

        {Object.entries(participants).map(([userId, p]) => (
          <div key={userId} style={{ marginBottom: 4 }}>
            {activeSpeakers.includes(String(userId)) && "🟢 "}
            {p.name || `User ${userId}`}
            {p.role === "host" && " 👑"}
            {p.role === "speaker" && " 🎤"}

            {isHost && p.role === "speaker" && (
              <button
                onClick={() => handleRemoveSpeaker(userId)}
                style={{ marginLeft: 8 }}
              >
                🔇 Remove speaker
              </button>
            )}
          </div>
        ))}
      </div>

      {handsRaised.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4>✋ Hands Raised</h4>
          {handsRaised.map((h, i) => (
            <span key={i} style={{ marginRight: 8 }}>
              {h.name || `User ${h.user_id}`}
            </span>
          ))}
        </div>
      )}

      <div style={{ border: "1px solid #ccc", padding: 10 }}>
        <h4>💬 Chat</h4>
        <div style={{ height: 150, overflowY: "auto", marginBottom: 8 }}>
          {messages.map((m, i) => (
            <p key={i}>
              <strong>{m.user}:</strong> {m.text}
            </p>
          ))}
          <div ref={chatBottomRef} />
        </div>
        <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 6 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1 }}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default LiveRoom;