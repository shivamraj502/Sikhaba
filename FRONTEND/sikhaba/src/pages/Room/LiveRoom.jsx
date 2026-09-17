// import { useParams } from 'react-router-dom';

// function LiveRoom() {
//   const { roomId } = useParams();
//   return <div>Live Room #{roomId} — full room UI coming next</div>;
// }

// export default LiveRoom;

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, getSocket, disconnectSocket } from '../../sockets/socketClient';
import {
  requestToSpeak,
  getPendingRequests,
  respondToRequest,
  endRoom,
  leaveRoom
} from '../../api/roomApi';

function LiveRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [handsRaised, setHandsRaised] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [mySpeakerStatus, setMySpeakerStatus] = useState(null); // 'pending' | 'approved' | 'rejected'
  const [isHost, setIsHost] = useState(false); // simplistic — refine once room data includes host_id
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.emit('join-room', { room_id: roomId });

    socket.on('participant-joined', (data) => {
      setParticipants((prev) => [...prev, data]);
    });

    socket.on('participant-left', (data) => {
      setParticipants((prev) => prev.filter((p) => p.user_id !== data.user_id));
    });

    socket.on('hand-raised', (data) => {
      setHandsRaised((prev) => [...prev, data]);
    });

    socket.on('speaker-approved', (data) => {
      if (data.user_id === user.id) setMySpeakerStatus('approved');
      setHandsRaised((prev) => prev.filter((h) => h.user_id !== data.user_id));
    });

    socket.on('speaker-rejected', (data) => {
      if (data.user_id === user.id) setMySpeakerStatus('rejected');
      setHandsRaised((prev) => prev.filter((h) => h.user_id !== data.user_id));
    });

    socket.on('room-ended', () => {
      alert('This room has ended.');
      navigate('/home');
    });

    // Refresh pending requests periodically if host (simple polling for now)
    loadPendingRequests();

    return () => {
      socket.emit('leave-room', { room_id: roomId });
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('hand-raised');
      socket.off('speaker-approved');
      socket.off('speaker-rejected');
      socket.off('room-ended');
    };
  }, [roomId]);

  async function loadPendingRequests() {
    try {
      const res = await getPendingRequests(roomId);
      setPendingRequests(res.data);
      setIsHost(true); // if this succeeds (200), user is the host — backend rejects non-hosts differently in a future pass
    } catch (err) {
      setIsHost(false); // not host, or no requests endpoint access
    }
  }

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
    setMessages((prev) => [...prev, { user: user.name, text: chatInput }]);
    // TODO: wire to a real chat socket event + persist via chat_messages table
    setChatInput('');
  }

  return (
    <div style={{ maxWidth: 700, margin: '20px auto', padding: '0 16px' }}>
      <h2>🎙️ Live Room #{roomId}</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {!isHost && mySpeakerStatus !== 'approved' && (
          <button onClick={handleRaiseHand} disabled={mySpeakerStatus === 'pending'}>
            {mySpeakerStatus === 'pending' ? '✋ Request sent...' : '✋ Raise Hand to Speak'}
          </button>
        )}
        {mySpeakerStatus === 'approved' && <span>🎤 You're approved to speak!</span>}
        {mySpeakerStatus === 'rejected' && <span>❌ Your request was declined.</span>}

        {isHost && <button onClick={handleEndRoom} style={{ color: 'red' }}>End Room</button>}
        {!isHost && <button onClick={handleLeaveRoom}>Leave Room</button>}
      </div>

      {isHost && pendingRequests.length > 0 && (
        <div style={{ border: '1px solid #f0ad4e', padding: 10, marginBottom: 16 }}>
          <h4>Speaker Requests</h4>
          {pendingRequests.map((req) => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{req.name} {req.country_code && `(${req.country_code})`}</span>
              <div>
                <button onClick={() => handleRespond(req.id, req.user_id, true)}>✅ Approve</button>
                <button onClick={() => handleRespond(req.id, req.user_id, false)} style={{ marginLeft: 6 }}>❌ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h4>👥 Participants ({participants.length})</h4>
        {participants.map((p, i) => (
          <span key={i} style={{ marginRight: 8 }}>{p.name || `User ${p.user_id}`}</span>
        ))}
      </div>

      {handsRaised.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4>✋ Hands Raised</h4>
          {handsRaised.map((h, i) => (
            <span key={i} style={{ marginRight: 8 }}>{h.name || `User ${h.user_id}`}</span>
          ))}
        </div>
      )}

      <div style={{ border: '1px solid #ccc', padding: 10 }}>
        <h4>💬 Chat</h4>
        <div style={{ height: 150, overflowY: 'auto', marginBottom: 8 }}>
          {messages.map((m, i) => (
            <p key={i}><strong>{m.user}:</strong> {m.text}</p>
          ))}
        </div>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 6 }}>
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