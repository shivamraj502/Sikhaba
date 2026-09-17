import { useParams } from 'react-router-dom';

function LiveRoom() {
  const { roomId } = useParams();
  return <div>Live Room #{roomId} — full room UI coming next</div>;
}

export default LiveRoom;