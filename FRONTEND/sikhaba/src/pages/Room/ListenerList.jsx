function ListenerList({ participants }) {
  return (
    <div>
      <h4>In this room ({participants.length})</h4>
      {participants.map((p) => (
        <div key={p.id}>
          {p.name} {p.country_code && `(${p.country_code})`} {p.role === 'host' && '🎙️'}
        </div>
      ))}
    </div>
  );
}

export default ListenerList;