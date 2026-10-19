import { useState, useEffect, useRef } from 'react';

function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10 }}>
      <div style={{ height: 250, overflowY: 'auto', marginBottom: 8 }}>
        {messages.map((m) => (
          <p key={m.id} style={{ margin: '4px 0' }}>
            <strong>{m.name}:</strong> {m.message}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6 }}>
        <input
          style={{ flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatPanel;