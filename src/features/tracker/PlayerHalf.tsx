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
  /** This player goes first this round. */
  hasPriority: boolean;
  onPassPriority: () => void;
}

const SIDE_LABEL: Record<Side, string> = { top: 'Top player', bottom: 'Bottom player' };

/**
 * One player's half of the tracker: tap the left half for −1, the right half
 * for +1. The player with priority gets a bright frame and a tappable FIRST
 * badge (on the edge nearest the middle band) that passes priority over.
 */
export function PlayerHalf({
  side,
  points,
  flipped,
  onIncrement,
  onDecrement,
  hasPriority,
  onPassPriority,
}: PlayerHalfProps) {
  const label = SIDE_LABEL[side];
  return (
    <View
      style={[styles.frame, flipped && styles.flipped, !hasPriority && styles.frameIdle]}
      testID={`player-half-${side}`}
    >
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
        {hasPriority && (
          <View style={styles.badgeSlot} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label} goes first. Pass priority`}
              hitSlop={8}
              onPress={onPassPriority}
              testID={`priority-badge-${side}`}
              style={({ pressed }) => [styles.badge, pressed && styles.badgePressed]}
            >
              <Text style={styles.badgeText}>FIRST ⇅</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.priority,
    borderRadius: radii.lg,
    padding: spacing.xs,
    backgroundColor: colors.surface,
  },
  frameIdle: { borderColor: colors.frameInner },
  flipped: { transform: [{ rotate: '180deg' }] },
  badgeSlot: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.priority,
    // Raised look so it reads as a button, not a label.
    borderBottomWidth: 3,
    borderBottomColor: colors.frameInner,
    elevation: 4,
  },
  badgePressed: { borderBottomWidth: 1, marginTop: 2 },
  badgeText: {
    color: colors.onPriority,
    fontSize: fontSizes.body,
    fontWeight: '800',
    letterSpacing: 2,
  },
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
