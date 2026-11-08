import { useEffect, useRef, useState } from 'react';

import { CHANGE_BURST_MS } from './timing';

/**
 * Net change of `value` during the current burst of quick changes; 0 once
 * CHANGE_BURST_MS passes without a change. Measured against the value before
 * the burst, so no-op taps (e.g. −1 at 0) don't count.
 */
export function useRecentChange(value: number): number {
  const previous = useRef(value);
  const baseline = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (value === previous.current) return;
    baseline.current ??= previous.current;
    previous.current = value;
    setDelta(value - baseline.current);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      baseline.current = null;
      timer.current = null;
      setDelta(0);
    }, CHANGE_BURST_MS);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return delta;
}
