import { useState, useEffect, useCallback } from 'react';

export default function useDailyTimer() {
  const [usage, setUsage] = useState(null); // { unlimited, secondsRemaining }

  const applyUsageUpdate = useCallback((data) => {
    setUsage({
      unlimited: !!data.unlimited,
      secondsRemaining: data.seconds_remaining ?? null
    });
  }, []);

  // Smooth local countdown between server updates (display only)
  const counting = !!usage && !usage.unlimited;
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => {
      setUsage((u) =>
        u && !u.unlimited && u.secondsRemaining > 0
          ? { ...u, secondsRemaining: u.secondsRemaining - 1 }
          : u
      );
    }, 1000);
    return () => clearInterval(t);
  }, [counting]);

  return { usage, applyUsageUpdate };
}