import { useCallback, useEffect, useRef, useState } from 'react';

import {
  INITIAL_MISSION_POINTS,
  decrement,
  increment,
  parseMissionPoints,
  type MissionPoints,
  type Side,
} from '@/domain/missionPoints';
import { load, save, type PersistedKey } from '@/storage/persisted';

export const MISSION_POINTS_KEY: PersistedKey<MissionPoints> = {
  key: 'tracker.missionPoints.v1',
  parse: parseMissionPoints,
};

/** Mission point state that survives the app being killed. */
export function useMissionPoints() {
  const [points, setPoints] = useState<MissionPoints>(INITIAL_MISSION_POINTS);
  // Don't let a slow initial load clobber taps made before it finished.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void load(MISSION_POINTS_KEY).then((stored) => {
      if (!cancelled && stored && !touched.current) setPoints(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((change: (current: MissionPoints) => MissionPoints) => {
    touched.current = true;
    setPoints((current) => {
      const next = change(current);
      if (next !== current) void save(MISSION_POINTS_KEY, next);
      return next;
    });
  }, []);

  return {
    points,
    increment: useCallback((side: Side) => update((p) => increment(p, side)), [update]),
    decrement: useCallback((side: Side) => update((p) => decrement(p, side)), [update]),
    reset: useCallback(() => update(() => INITIAL_MISSION_POINTS), [update]),
  };
}
