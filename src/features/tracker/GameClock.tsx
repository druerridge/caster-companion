import { useCallback, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { OutlinedText } from '@/components/OutlinedText';
import { formatElapsed } from '@/domain/game';
import { colors, fonts, fontSizes } from '@/theme/tokens';

/** Poll often enough to flip each second on time; React only re-renders on change. */
const POLL_MS = 250;

/**
 * Whole seconds since `startedAt`, read fresh on every render (so it's right
 * the moment the drawer opens) and polled only while `running`.
 */
function useElapsedSeconds(startedAt: number, running: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!running) return () => {};
      const id = setInterval(onChange, POLL_MS);
      return () => clearInterval(id);
    },
    [running],
  );
  // Stable within a second, as useSyncExternalStore requires.
  return useSyncExternalStore(subscribe, () => Math.floor((Date.now() - startedAt) / 1000));
}

function ElapsedText({ startedAt, running }: { startedAt: number; running: boolean }) {
  return <ClockText text={formatElapsed(useElapsedSeconds(startedAt, running) * 1000)} />;
}

function ClockText({ text }: { text: string }) {
  return (
    <View accessible accessibilityLabel={`Game time ${text}`}>
      <OutlinedText style={styles.clock} outline={3} testID="game-clock">
        {text}
      </OutlinedText>
    </View>
  );
}

interface GameClockProps {
  /** Game start (epoch ms); null shows "--:--" (game saved before the timer existed). */
  startedAt: number | null;
  /** Tick only while visible, to avoid re-rendering a hidden drawer every second. */
  running: boolean;
}

/** Elapsed game time, e.g. "05:41". Wall-clock based, so it survives the app closing. */
export function GameClock({ startedAt, running }: GameClockProps) {
  return startedAt === null ? (
    <ClockText text="--:--" />
  ) : (
    <ElapsedText startedAt={startedAt} running={running} />
  );
}

const styles = StyleSheet.create({
  clock: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: fontSizes.heading * 1.4,
    fontVariant: ['tabular-nums'],
  },
});
