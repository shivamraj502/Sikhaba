import { formatTime } from '../utils/formatTime';

function TimerBadge({ usage }) {
  if (!usage || usage.unlimited || usage.secondsRemaining == null) return null;

  const low = usage.secondsRemaining <= 300;
  return (
    <span style={{ marginLeft: 8, color: low ? 'orange' : 'inherit' }}>
      ⏱️ {formatTime(usage.secondsRemaining)} left today
    </span>
  );
}

export default TimerBadge;