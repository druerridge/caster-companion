import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { CHANGE_BURST_MS, CHANGE_FADE_MS, CHANGE_HOLD_MS } from './timing';

/**
 * Net change of `value` during the current burst of quick changes; 0 once
 * CHANGE_BURST_MS passes without a change. Measured against the value before
 * the burst, so no-op taps (e.g. −1 at 0) don't count.
 *
 * `opacity` holds at 1 for CHANGE_HOLD_MS after each change, then fades to 0
 * over CHANGE_FADE_MS, reaching 0 just as the burst ends.
 */
export function useRecentChange(value: number): { delta: number; opacity: Animated.Value } {
  const previous = useRef(value);
  const baseline = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [delta, setDelta] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (value === previous.current) return;
    baseline.current ??= previous.current;
    previous.current = value;
    setDelta(value - baseline.current);

    opacity.stopAnimation();
    opacity.setValue(1);
    Animated.sequence([
      Animated.delay(CHANGE_HOLD_MS),
      Animated.timing(opacity, {
        toValue: 0,
        duration: CHANGE_FADE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      baseline.current = null;
      timer.current = null;
      setDelta(0);
    }, CHANGE_BURST_MS);
  }, [value, opacity]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      opacity.stopAnimation();
    },
    [opacity],
  );

  return { delta, opacity };
}
