import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLiveRooms, createRoom, joinRoom } from '../../api/roomApi';
import { useAuth } from '../../context/AuthContext';

function Home() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      const res = await getLiveRooms();
      setRooms(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    try {
      const res = await createRoom({ title, language });
      navigate(`/room/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    }
  }

  async function handleJoinRoom(roomId) {
    try {
      await joinRoom(roomId);
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room');
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '30px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🌐 Sikhaba — Live Rooms</h2>
        <div>
          <span>Hi, {user?.name}</span>
          <button onClick={logout} style={{ marginLeft: 12 }}>Logout</button>
        </div>
      </div>

      <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ margin: '16px 0' }}>
        {showCreateForm ? 'Cancel' : '+ Create Room'}
      </button>

      {showCreateForm && (
        <form onSubmit={handleCreateRoom} style={{ marginBottom: 20, border: '1px solid #ccc', padding: 12 }}>
          <input
            type="text"
            placeholder="Room title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <br /><br />
          <input
            type="text"
            placeholder="Language (e.g. English)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
          <br /><br />
          <button type="submit">Start Room</button>
        </form>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p>Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p>No live rooms right now. Start one!</p>
      ) : (
        rooms.map((room) => (
          <div key={room.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 10, borderRadius: 6 }}>
            <h3>{room.title}</h3>
            <p>🎙️ Host: {room.host_name} {room.host_country && `(${room.host_country})`}</p>
            <p>🗣️ Language: {room.language || 'Not specified'}</p>
            <button onClick={() => handleJoinRoom(room.id)}>Join Room</button>
          </div>
        ))
      )}
    </div>
  );
}

export default Home;