import { useEffect, useState, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../sockets/socketClient';

export default function useRoomSocket(roomId) {
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const join = () => {
      setConnected(true);
      socket.emit('join-room', { roomId });
    };

    socket.on('connect', join);
    if (socket.connected) join();

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(err.message));
    socket.on('room-error', ({ message }) => setError(message));
    socket.on('room-state', ({ participants }) => setParticipants(participants));
    socket.on('user-joined', (u) =>
      setParticipants((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, { ...u, role: 'listener' }]))
    );
    socket.on('user-left', ({ id }) => setParticipants((prev) => prev.filter((p) => p.id !== id)));
    socket.on('chat-message', (msg) => setMessages((prev) => [...prev, msg]));

    return () => {
      socket.emit('leave-room', { roomId });
      socket.off();
      disconnectSocket();
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message) => socketRef.current?.emit('chat-message', { roomId, message }),
    [roomId]
  );

  return { participants, messages, error, connected, sendMessage };
}