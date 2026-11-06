import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Side } from '@/domain/missionPoints';
import { colors, fontSizes, radii, spacing } from '@/theme/tokens';

interface PlayerHalfProps {
  side: Side;
  points: number;
  /** Rotate 180° so the player across the table reads it right-side up. */
  flipped?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top player', bottom: 'Bottom player' };

/** One player's half of the tracker: tap the left half for −1, the right half for +1. */
export function PlayerHalf({ side, points, flipped, onIncrement, onDecrement }: PlayerHalfProps) {
  const label = SIDE_LABEL[side];
  return (
    <View style={[styles.frame, flipped && styles.flipped]} testID={`player-half-${side}`}>
      <View style={styles.inner}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: decrease mission points`}
            onPress={onDecrement}
            style={({ pressed }) => [styles.zone, styles.zoneLeft, pressed && styles.zonePressed]}
          >
            <Text style={styles.hint}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: increase mission points`}
            onPress={onIncrement}
            style={({ pressed }) => [styles.zone, styles.zoneRight, pressed && styles.zonePressed]}
          >
            <Text style={styles.hint}>+</Text>
          </Pressable>
        </View>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.score} testID={`mission-points-${side}`}>
            {points}
          </Text>
          <Text style={styles.caption}>Mission Points</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.frame,
    borderRadius: radii.lg,
    padding: spacing.xs,
    backgroundColor: colors.surface,
  },
  flipped: { transform: [{ rotate: '180deg' }] },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.frameInner,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  row: { flex: 1, flexDirection: 'row' },
  zone: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  zoneLeft: { alignItems: 'flex-start' },
  zoneRight: { alignItems: 'flex-end' },
  zonePressed: { backgroundColor: colors.surfaceRaised },
  hint: { color: colors.textMuted, fontSize: fontSizes.heading, fontWeight: '300' },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: colors.text,
    fontSize: fontSizes.score,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
